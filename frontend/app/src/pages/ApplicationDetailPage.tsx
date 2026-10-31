import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { ScopeNotice } from "@/components/ScopeNotice";
import { useAuth } from "@/components/useAuth";
import {
  getApplication,
  listApplicationDocuments,
  listApplicationFindings,
  runApplicationValidation,
  reviewApplicationFinding,
  uploadApplicationDocument,
  downloadApplicationReport,
  type ApplicationFinding,
  type ApplicationDocument,
  type ApplicationRecord,
} from "@/lib/api-applications";

const NOT_EVALUATED_NOTICE =
  "Items marked pending configuration are not evaluated against any official AICTE rule. " +
  "Configure them from a verified source before relying on them.";

function statusBadge(status: string) {
  if (status === "preliminary_checks_passed") return <Badge variant="success">Preliminary check passed</Badge>;
  if (status === "attention_required") return <Badge variant="error">Attention required</Badge>;
  return <Badge variant="neutral">{status.replace(/_/g, " ")}</Badge>;
}

function itemBadge(status: string) {
  switch (status) {
    case "mandatory":
      return <Badge variant="error">Mandatory</Badge>;
    case "conditional":
      return <Badge variant="warning">Conditional</Badge>;
    case "not_applicable":
      return <Badge variant="neutral">Not applicable</Badge>;
    default:
      return <Badge variant="info">Pending configuration</Badge>;
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge variant="error">Critical</Badge>;
    case "high":
      return <Badge variant="error">High</Badge>;
    case "medium":
      return <Badge variant="warning">Medium</Badge>;
    default:
      return <Badge variant="info">Info</Badge>;
  }
}

function findingStatusBadge(status: string) {
  switch (status) {
    case "resolved":
      return <Badge variant="success">Resolved</Badge>;
    case "rejected":
      return <Badge variant="neutral">Rejected</Badge>;
    case "escalated":
      return <Badge variant="warning">Escalated</Badge>;
    default:
      return <Badge variant="error">Open</Badge>;
  }
}

export function ApplicationDetailPage() {
  const { applicationId = "" } = useParams();
  const auth = useAuth();
  const token = auth.session?.access_token ?? null;
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [findings, setFindings] = useState<ApplicationFinding[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [checklistItem, setChecklistItem] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [validating, setValidating] = useState(false);
  const [validateMessage, setValidateMessage] = useState<string | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"resolve" | "reject" | "escalate">("resolve");
  const [rationale, setRationale] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const loadAll = useCallback(async () => {
    const token = tokenRef.current;
    if (!token || !applicationId) return;
    try {
      const app = await getApplication(applicationId, token);
      setApplication(app);
      const docs = await listApplicationDocuments(applicationId, token);
      setDocuments(docs);
      const fnd = await listApplicationFindings(applicationId, token);
      setFindings(fnd);
      if (app.checklist.length > 0) {
        setChecklistItem((prev) => prev || app.checklist[0].item_id);
      }
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load the application.");
    }
  }, [applicationId]);

  useEffect(() => {
    tokenRef.current = token;
    void loadAll();
  }, [token, loadAll]);

  const canSubmit = Boolean(token && checklistItem && file);

  async function handleUpload() {
    const t = tokenRef.current;
    if (!t || !file || !applicationId) return;
    setUploading(true);
    setUploadError(null);
    setUploadMessage(null);
    try {
      const stored = await uploadApplicationDocument(applicationId, t, file, checklistItem || null);
      setUploadMessage(
        `Stored ${stored.filename} · sha256 ${stored.sha256.slice(0, 12)}… · scan ${stored.scan_status}` +
          (stored.extracted_metadata?.ocr_status ? ` · OCR ${stored.extracted_metadata.ocr_status}` : ""),
      );
      setFile(null);
      await loadAll();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleValidate() {
    const t = tokenRef.current;
    if (!t || !applicationId) return;
    setValidating(true);
    setValidateError(null);
    setValidateMessage(null);
    try {
      const fresh = await runApplicationValidation(applicationId, t);
      setFindings(fresh);
      const blocking = fresh.filter((f) => f.severity !== "info" && f.status === "open");
      setValidateMessage(
        blocking.length > 0
          ? `${blocking.length} blocking finding(s) recorded.`
          : "All executed structural checks passed. Unconfigured rules were not evaluated.",
      );
      await loadAll();
    } catch (err) {
      setValidateError(err instanceof Error ? err.message : "Validation run failed.");
    } finally {
      setValidating(false);
    }
  }

  async function handleReview(findingId: string) {
    const t = tokenRef.current;
    if (!t || !applicationId) return;
    setReviewBusy(true);
    setReviewError(null);
    try {
      await reviewApplicationFinding(
        applicationId,
        findingId,
        { decision: reviewDecision, rationale },
        t,
      );
      setReviewTarget(null);
      setRationale("");
      await loadAll();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Review action failed.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleDownload() {
    const t = tokenRef.current;
    if (!t || !applicationId) return;
    setDownloading(true);
    try {
      await downloadApplicationReport(applicationId, t);
    } catch (err) {
      setValidateError(err instanceof Error ? err.message : "Report download failed.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link to="/applications" className="text-xs text-text-secondary hover:text-text-heading">← All applications</Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-text-heading">
          {application
            ? `${application.application_type.toUpperCase()} · ${application.academic_year}`
            : "Application"}
        </h1>
        {application && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
            {statusBadge(application.status)}
            <span>{application.institution_external_ref}</span>
            <span>created {new Date(application.created_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <ScopeNotice />

      <Card>
        <CardHeader>
          <CardTitle>Generated checklist</CardTitle>
          <CardDescription>
            Derived from the declared parameters. Statuses are demo configuration; unconfigured items
            are never evaluated into pass/fail findings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError && <p role="alert" className="text-sm text-error-text">{loadError}</p>}
          {application && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                    <th className="py-2.5 pr-3">Item</th>
                    <th className="py-2.5 pr-3">Status</th>
                    <th className="py-2.5 pr-3">Rule</th>
                    <th className="py-2.5">Linked docs</th>
                  </tr>
                </thead>
                <tbody>
                  {application.checklist.map((item) => {
                    const linked = documents.filter(
                      (doc) => doc.application_link?.checklist_item_id === item.item_id,
                    );
                    return (
                      <tr key={item.item_id} className="border-b border-border/60">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-text-heading">{item.label}</div>
                          <div className="text-xs text-text-muted">{item.description}</div>
                        </td>
                        <td className="py-2.5 pr-3">{itemBadge(item.status)}</td>
                        <td className="py-2.5 pr-3 text-xs text-text-secondary">{item.rule_id_versioned}</td>
                        <td className="py-2.5 text-xs text-text-secondary">
                          {linked.length === 0 ? "—" : linked.map((d) => d.filename).join(", ")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload document against checklist item</CardTitle>
          <CardDescription>
            PDFs are analysed server-side: select text/OCR extraction, antivirus status and metadata
            candidates are recorded in the document vault and linked to this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <select
              aria-label="Checklist item"
              value={checklistItem}
              onChange={(e) => setChecklistItem(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-1 px-3 py-2 text-sm text-text-body"
            >
              {(application?.checklist ?? [])
                .filter((item) => item.status === "mandatory" || item.status === "conditional")
                .map((item) => (
                  <option key={item.item_id} value={item.item_id}>{item.label}</option>
                ))}
            </select>
            <input
              aria-label="PDF file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-border bg-bg-1 px-3 py-2 text-sm text-text-body"
            />
          </div>
          <Button onClick={() => void handleUpload()} disabled={!canSubmit || uploading}>
            {uploading ? "Uploading…" : "Upload PDF"}
          </Button>
          {uploadMessage && <p role="status" className="text-sm text-success-text">{uploadMessage}</p>}
          {uploadError && <p role="alert" className="text-sm text-error-text">{uploadError}</p>}
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {documents.map((doc) => {
                const meta = doc.extracted_metadata ?? {};
                const candidates = meta.candidate_fields ?? {};
                return (
                  <li key={doc.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text-heading">{doc.filename}</span>
                      <Badge variant={doc.scan_status === "clean" ? "success" : doc.scan_status === "infected" ? "error" : "warning"}>
                        scan: {doc.scan_status}
                      </Badge>
                      <Badge variant={meta.ocr_status === "unavailable" ? "warning" : "neutral"}>
                        ocr: {meta.ocr_status ?? "unknown"}
                      </Badge>
                      {meta.requires_human_review !== false && <Badge variant="info">human review required</Badge>}
                      {meta.is_scanned_only ? <Badge variant="warning">low-quality scan</Badge> : null}
                    </div>
                    <div className="mt-2 grid gap-x-6 gap-y-1 text-xs text-text-secondary md:grid-cols-2">
                      <div>sha256: <code>{doc.sha256.slice(0, 16)}…</code></div>
                      <div>restricted to checklist item: {doc.application_link?.checklist_item_id ?? "—"}</div>
                      <div>expiry date: {candidates.expiry_date ?? "not extracted"}</div>
                      <div>issue date: {candidates.issue_date ?? "not extracted"}</div>
                      <div>certificate no.: {candidates.certificate_number ?? "not extracted"}</div>
                      <div>issuing authority: {candidates.issuing_authority ?? "not extracted"}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Preliminary rule validation</CardTitle>
          <CardDescription>
            Executes only the structural checks backed by submitted evidence. No AICTE rule values are
            evaluated because none are configured in this prototype.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => void handleValidate()} disabled={validating || !tokenRef.current}>
            {validating ? "Validating…" : "Run validation"}
          </Button>
          {validateMessage && <p role="status" className="text-sm text-success-text">{validateMessage}</p>}
          {validateError && <p role="alert" className="text-sm text-error-text">{validateError}</p>}

          {findings.length > 0 && (
            <ul className="space-y-3">
              {findings.map((finding) => (
                <li key={finding.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {severityBadge(finding.severity)}
                    {findingStatusBadge(finding.status)}
                    <span className="font-semibold text-text-heading">{finding.code}</span>
                    <span className="text-xs text-text-muted">{finding.rule_id}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-text-body">{finding.message}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    <strong>Next action:</strong> {finding.recommended_action}
                  </p>
                  {finding.status !== "open" && (
                    <p className="mt-1 text-xs text-text-muted">resolved at {finding.resolved_at}</p>
                  )}
                  {finding.status === "open" && (
                    <div className="mt-3">
                      {reviewTarget === finding.id ? (
                        <div className="space-y-2">
                          <select
                            aria-label="Review decision"
                            value={reviewDecision}
                            onChange={(e) => setReviewDecision(e.target.value as typeof reviewDecision)}
                            className="rounded-lg border border-border bg-bg-1 px-3 py-1.5 text-sm"
                          >
                            <option value="resolve">Resolve</option>
                            <option value="reject">Reject</option>
                            <option value="escalate">Escalate</option>
                          </select>
                          <textarea
                            aria-label="Review rationale"
                            value={rationale}
                            onChange={(e) => setRationale(e.target.value)}
                            rows={2}
                            minLength={10}
                            placeholder="Explain your decision (minimum 10 characters)…"
                            className="w-full rounded-lg border border-border bg-bg-1 px-3 py-2 text-sm"
                          />
                          {reviewError && <p role="alert" className="text-xs text-error-text">{reviewError}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" disabled={reviewBusy || rationale.trim().length < 10} onClick={() => void handleReview(finding.id)}>
                              {reviewBusy ? "Saving…" : "Save review"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setReviewTarget(null); setReviewError(null); }}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => { setReviewTarget(finding.id); setReviewError(null); }}>
                          Record review decision
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {findings.length > 0 && (
            <p className="text-xs text-text-muted">{NOT_EVALUATED_NOTICE}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preliminary scrutiny report</CardTitle>
          <CardDescription>
            Download the saved report for this application: checklist, documents, findings, review
            decisions and the audit history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => void handleDownload()} disabled={downloading || !tokenRef.current}>
            {downloading ? "Preparing…" : "Download report (JSON)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

