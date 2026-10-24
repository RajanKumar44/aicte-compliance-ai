import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Clock3, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { ValidationResults } from "@/components/ValidationResults";
import { useAuth } from "@/components/useAuth";
import { deleteValidationRun, fetchValidationRun, fetchValidationRuns, type SavedValidationRun } from "@/lib/api";

const PAGE_SIZE = 25;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function HistoryPage() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const { runId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedValidationRun[]>([]);
  const [record, setRecord] = useState<SavedValidationRun | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    if (runId) {
      const result = await fetchValidationRun(runId, token);
      setError("");
      if (result.ok) setRecord(result.data);
      else { setRecord(null); setError(Object.values(result.errors)[0] || "Unable to load this history record."); }
    } else {
      const result = await fetchValidationRuns(token, PAGE_SIZE, offset);
      setError("");
      if (result.ok) { setItems(result.data.items); setHasMore(result.data.has_more); }
      else { setItems([]); setError(Object.values(result.errors)[0] || "Unable to load history."); }
    }
    setLoading(false);
  }, [offset, runId, token]);

  // oxlint-disable-next-line react(set-state-in-effect)
  useEffect(() => { void load(); }, [load]);

  async function handleDelete() {
    if (!record || !window.confirm("Delete this saved validation record? This cannot be undone.")) return;
    setDeleting(true);
    setLoading(true);
    setError("");
    const result = await deleteValidationRun(record.id, token);
    setDeleting(false);
    if (!result.ok) { setError(Object.values(result.errors)[0] || "The record could not be deleted."); return; }
    navigate("/history", { replace: true });
  }

  if (runId && record) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Link to="/history" className="inline-flex items-center gap-2 text-sm text-text-secondary underline underline-offset-4 hover:text-text-heading"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to history</Link>
            <h1 className="text-3xl font-bold tracking-tight text-text-heading">Saved validation</h1>
            <p className="text-sm text-text-secondary">{record.institution_name} · {record.institution_id} · checked {formatDate(record.checked_at)}</p>
          </div>
          <Button variant="secondary" disabled={deleting} onClick={handleDelete} leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
            {deleting ? "Deleting…" : "Delete record"}
          </Button>
        </header>
        {error && <p className="text-sm text-error-text" role="alert">{error}</p>}
        <div className="flex items-start gap-3 border border-info-border bg-info-bg/40 p-4 text-sm leading-relaxed text-text-body" role="note">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-info-text" aria-hidden="true" />
          <p>This record is scheduled for deletion after {formatDate(record.expires_at)}. It contains the submitted document names and expiry dates, not uploaded files.</p>
        </div>
        <ValidationResults data={record.result} request={record.request} onReset={() => navigate("/history")} />
      </div>
    );
  }

  if (runId && loading) {
    return <p className="py-12 text-center text-sm text-text-secondary" role="status">Loading saved validation…</p>;
  }
  if (runId) {
    return <div className="space-y-5"><Link to="/history" className="inline-flex items-center gap-2 text-sm text-text-secondary underline underline-offset-4"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to history</Link><p className="text-sm text-error-text" role="alert">{error || "This validation record was not found."}</p></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-300">Institution records</p>
        <h1 className="text-3xl font-bold tracking-tight text-text-heading">Validation history</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">Only records you created and records visible to your institution reviewer or administrator role appear here. Saved request and result snapshots are deleted after 365 days.</p>
      </header>

      <div className="flex items-start gap-3 border border-warning-border bg-warning-bg/30 p-4 text-sm leading-relaxed text-text-body" role="note">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-text" aria-hidden="true" />
        <p>AICTE rules are inactive. These records show comparisons against the checklist supplied at validation time, not a regulatory compliance decision.</p>
      </div>

      {error && <p className="text-sm text-error-text" role="alert">{error}</p>}
      {loading ? <p className="py-8 text-center text-sm text-text-secondary" role="status">Loading validation history…</p>
        : items.length === 0 && !error ? (
          <Card><CardContent className="space-y-3 p-6"><h2 className="font-semibold text-text-heading">No saved records</h2><p className="text-sm text-text-secondary">Save a validation run from the form to see it here. Records are not created automatically.</p><Link to="/validate" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary-300 underline underline-offset-4">Open validation form</Link></CardContent></Card>
        ) : (
          <>
            <ul className="space-y-3" aria-label="Saved validation runs">
              {items.map((item) => (
                <li key={item.id}>
                  <Link to={`/history/${encodeURIComponent(item.id)}`} onClick={() => setLoading(true)} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">
                    <Card className="transition-colors hover:border-border-hover"><CardContent className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0 space-y-1"><h2 className="truncate font-semibold text-text-heading">{item.institution_name} <span className="font-normal text-text-secondary">({item.institution_id})</span></h2><p className="text-sm text-text-secondary">{item.application_type.replace(/_/g, " ")} · Checked {formatDate(item.checked_at)}</p></div>
                      <span className="text-xs text-text-muted">Delete after {formatDate(item.expires_at)}</span>
                    </CardContent></Card>
                  </Link>
                </li>
              ))}
            </ul>
            <nav className="flex items-center justify-between gap-4" aria-label="History pagination">
              <Button variant="secondary" disabled={offset === 0 || loading} onClick={() => { setLoading(true); setOffset(Math.max(0, offset - PAGE_SIZE)); }}>Previous</Button>
              <span className="text-sm text-text-secondary">Records {offset + 1}–{offset + items.length}</span>
              <Button variant="secondary" disabled={!hasMore || loading} onClick={() => { setLoading(true); setOffset(offset + PAGE_SIZE); }}>Next</Button>
            </nav>
          </>
        )}
    </div>
  );
}
