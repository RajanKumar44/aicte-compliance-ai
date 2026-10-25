import { useCallback, useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Trash2,
  Search,
  Download,
  RotateCcw,
  CheckCircle2,
  Building2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { ValidationResults } from "@/components/ValidationResults";
import { useAuth } from "@/components/useAuth";
import type { SavedValidationRun } from "@/lib/api";
import {
  fetchRunsUnified,
  fetchRunByIdUnified,
  deleteRunUnified,
  exportRunsAsCsv,
} from "@/lib/history-storage";

const PAGE_SIZE = 25;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function HistoryPage() {
  const auth = useAuth();
  const { session, demoUser } = auth;
  const { runId } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState<SavedValidationRun[]>([]);
  const [record, setRecord] = useState<SavedValidationRun | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "attention_required" | "preliminary_checks_passed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    if (!session && !demoUser) {
      setLoading(false);
      return;
    }
    if (runId) {
      const result = await fetchRunByIdUnified(runId, { session, demoUser });
      setError("");
      if (result.ok) {
        setRecord(result.data);
      } else {
        setRecord(null);
        setError(Object.values(result.errors)[0] || "Unable to load this history record.");
      }
    } else {
      const result = await fetchRunsUnified({ session, demoUser }, PAGE_SIZE, offset);
      setError("");
      if (result.ok) {
        setItems(result.data.items);
        setHasMore(result.data.has_more);
      } else {
        setItems([]);
        setError(Object.values(result.errors)[0] || "Unable to load history.");
      }
    }
    setLoading(false);
  }, [offset, runId, session, demoUser]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete() {
    if (!record || !window.confirm("Permanently delete this saved validation record?")) return;
    setDeleting(true);
    setLoading(true);
    setError("");
    const result = await deleteRunUnified(record.id, { session, demoUser });
    setDeleting(false);
    if (!result.ok) {
      setError(Object.values(result.errors)[0] || "The record could not be deleted.");
      return;
    }
    navigate("/history", { replace: true });
  }

  // Filter items in client
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.institution_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.institution_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.application_type?.toLowerCase().includes(searchQuery.toLowerCase());

      const itemStatus = item.result?.status;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "attention_required" && itemStatus === "attention_required") ||
        (statusFilter === "preliminary_checks_passed" && itemStatus === "preliminary_checks_passed");

      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  function handleExportCsv() {
    const csvData = exportRunsAsCsv(filteredItems.length ? filteredItems : items);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aicte_validation_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleRerunInWorkspace(run: SavedValidationRun) {
    navigate("/validate", {
      state: {
        prefill: {
          institution_id: run.institution_id,
          application_type: run.application_type,
          required_documents: run.request?.required_documents || [],
          submitted_documents: run.request?.submitted_documents || [],
          expiry_dates: run.request?.expiry_dates || {},
        },
      },
    });
  }

  // Individual record view
  if (runId && record) {
    return (
      <div className="space-y-6 animate-fade-in">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Link
              to="/history"
              className="inline-flex items-center gap-2 text-sm text-text-secondary underline underline-offset-4 hover:text-text-heading"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to audit history
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-text-heading">
              Scrutiny Record Details
            </h1>
            <p className="text-sm text-text-secondary">
              {record.institution_name} · <span className="font-mono">{record.institution_id}</span> · Evaluated {formatDate(record.checked_at)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => handleRerunInWorkspace(record)}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Re-evaluate in Workspace
            </Button>
            <Button
              variant="secondary"
              disabled={deleting}
              onClick={handleDelete}
              leftIcon={<Trash2 className="h-4 w-4 text-error-text" />}
            >
              {deleting ? "Deleting…" : "Delete Record"}
            </Button>
          </div>
        </header>

        {error && <p className="text-sm text-error-text" role="alert">{error}</p>}

        <div className="flex items-start gap-3 rounded-lg border border-info-border bg-info-bg/30 p-4 text-sm leading-relaxed text-text-body" role="note">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-info-text" aria-hidden="true" />
          <p>
            This validation snapshot is retained for regulatory scrutiny and institutional governance. Scheduled for automated purge on {formatDate(record.expires_at)}.
          </p>
        </div>

        <ValidationResults
          data={record.result}
          request={record.request}
          onReset={() => navigate("/history")}
        />
      </div>
    );
  }

  if (runId && loading) {
    return <p className="py-12 text-center text-sm text-text-secondary" role="status">Loading saved validation snapshot…</p>;
  }

  if (runId) {
    return (
      <div className="space-y-5">
        <Link to="/history" className="inline-flex items-center gap-2 text-sm text-text-secondary underline underline-offset-4">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to history
        </Link>
        <p className="text-sm text-error-text" role="alert">{error || "This validation record was not found."}</p>
      </div>
    );
  }

  // List view
  return (
    <div className="mx-auto max-w-5xl space-y-7 animate-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
            Institutional Audit Records
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-heading">
            Validation & Scrutiny History
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
            Inspect previous institutional submissions, review deficiency reports, and re-run preliminary validations against AICTE approval criteria.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={items.length === 0}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>
          <Link to="/validate">
            <Button size="sm">New Scrutiny Run</Button>
          </Link>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            type="text"
            className="app-control w-full rounded-md border border-border bg-bg-1 py-2.5 pl-10 pr-4 text-sm text-text-heading placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            placeholder="Search by institution name, code, or application type…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-1 p-1">
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === "all" ? "bg-bg-3 text-text-heading" : "text-text-secondary hover:text-text-heading"
            }`}
            onClick={() => setStatusFilter("all")}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === "attention_required"
                ? "bg-warning-bg/60 text-warning-text"
                : "text-text-secondary hover:text-text-heading"
            }`}
            onClick={() => setStatusFilter("attention_required")}
          >
            Attention Required
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === "preliminary_checks_passed"
                ? "bg-success-bg/60 text-success-text"
                : "text-text-secondary hover:text-text-heading"
            }`}
            onClick={() => setStatusFilter("preliminary_checks_passed")}
          >
            Checks Passed
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-error-text" role="alert">{error}</p>}

      {!session && !demoUser ? (
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-text-muted" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="font-semibold text-text-heading">Sign in to view institutional audit history</h2>
              <p className="mx-auto max-w-md text-sm text-text-secondary">
                Saved validation records and deficiency reports are securely scoped to authenticated institutions via Supabase RLS.
              </p>
            </div>
            <Link to="/signin" className="inline-block pt-2">
              <Button>Sign In to Workspace</Button>
            </Link>
          </CardContent>
        </Card>
      ) : loading ? (
        <p className="py-12 text-center text-sm text-text-secondary" role="status">
          Loading validation records…
        </p>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <Building2 className="mx-auto h-10 w-10 text-text-muted" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="font-semibold text-text-heading">
                {items.length === 0 ? "No saved validation records" : "No records match your filter"}
              </h2>
              <p className="mx-auto max-w-md text-sm text-text-secondary">
                {items.length === 0
                  ? "When you run an institutional check on the validation workspace with 'Save run' checked, the record and deficiency report will appear here."
                  : "Try modifying your search query or status filter to see other saved institutional runs."}
              </p>
            </div>
            {items.length === 0 && (
              <Link to="/validate" className="inline-block pt-2">
                <Button>Open Validation Workspace</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="space-y-3" aria-label="Saved validation runs">
            {filteredItems.map((item) => {
              const findingsCount = item.result?.findings?.length ?? 0;
              const isPassed = item.result?.status === "preliminary_checks_passed";

              return (
                <li key={item.id}>
                  <Card className="transition-colors hover:border-border-hover">
                    <CardContent className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="font-semibold text-text-heading truncate">
                            {item.institution_name}
                          </h2>
                          <span className="font-mono text-xs text-text-muted">
                            ({item.institution_id})
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isPassed
                                ? "bg-success-bg/40 text-success-text border border-success-border"
                                : "bg-warning-bg/40 text-warning-text border border-warning-border"
                            }`}
                          >
                            {isPassed ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <ShieldAlert className="h-3 w-3" />
                            )}
                            {isPassed ? "Checks Passed" : `${findingsCount} Deficiency Flag${findingsCount === 1 ? "" : "s"}`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                          <span>
                            Application: <strong className="text-text-heading uppercase">{item.application_type.replace(/_/g, " ")}</strong>
                          </span>
                          <span>·</span>
                          <span>Evaluated: {formatDate(item.checked_at)}</span>
                          <span>·</span>
                          <span>Required: {item.request?.required_documents?.length ?? 0} docs</span>
                          <span>·</span>
                          <span>Submitted: {item.request?.submitted_documents?.length ?? 0} docs</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 sm:self-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRerunInWorkspace(item)}
                          title="Load this submission into the validator"
                          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                        >
                          Re-run
                        </Button>
                        <Link to={`/history/${encodeURIComponent(item.id)}`}>
                          <Button size="sm" variant="primary">
                            View Report
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>

          <nav className="flex items-center justify-between gap-4 border-t border-border pt-4" aria-label="History pagination">
            <Button
              variant="secondary"
              size="sm"
              disabled={offset === 0 || loading}
              onClick={() => {
                setLoading(true);
                setOffset(Math.max(0, offset - PAGE_SIZE));
              }}
            >
              Previous Page
            </Button>
            <span className="text-xs text-text-secondary">
              Showing records {offset + 1}–{offset + filteredItems.length} of {items.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!hasMore || loading}
              onClick={() => {
                setLoading(true);
                setOffset(offset + PAGE_SIZE);
              }}
            >
              Next Page
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
