import {
  FileText,
  Server,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/Card";
import { Badge } from "@/components/Badge";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-slide-up">
      <div className="space-y-3">
        <span className="inline-block rounded-md bg-primary-900/30 px-3 py-1 text-xs font-semibold tracking-wider text-primary-300">
          DOCUMENTATION
        </span>
        <h1 className="text-3xl font-bold text-text-heading">About This Tool</h1>
        <p className="text-text-secondary max-w-2xl leading-relaxed">
          AICTE Compliance AI compares the document lists and expiry dates supplied with a request.
          It does not load an authoritative AICTE checklist or rule set.
        </p>
      </div>

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(17rem,0.9fr)] lg:gap-8">
        <div className="min-w-0 space-y-7">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-lg">
                  <FileText className="h-5 w-5 text-primary-400" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle>What This Tool Evaluates</CardTitle>
                  <CardDescription>
                    Checks only the submitted lists and expiry dates in this request
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex gap-4">
                <CheckCircle2 className="h-5 w-5 text-success-text flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="font-medium text-text-heading">Missing Document Detection</h4>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    Compares the caller-supplied submitted list against the caller-supplied required list. Any
                    required document not present in the submitted list is flagged with
                    code <code className="font-mono text-xs bg-bg-3 px-1.5 py-0.5 rounded">MISSING_DOCUMENT</code>.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Clock className="h-5 w-5 text-warning-text flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="font-medium text-text-heading">Expiry Date Verification</h4>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    Checks supplied expiry dates against the server's current UTC date. Documents with dates in the
                    past are flagged with code <code className="font-mono text-xs bg-bg-3 px-1.5 py-0.5 rounded">DOCUMENT_EXPIRED</code>.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <FileText className="h-5 w-5 text-info-text flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="font-medium text-text-heading">Evidence-Linked Findings</h4>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                    Each finding describes a missing or expired document and includes code-specific evidence
                    explaining why that item was flagged.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-500/20 rounded-lg">
                  <Server className="h-5 w-5 text-accent-400" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle>API Contract</CardTitle>
                  <CardDescription>Validation and saved-history endpoints</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0 space-y-6">
              <div>
                  <h4 className="mb-4 font-medium text-text-heading">Endpoints</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="text-left text-text-secondary border-b border-border">
                        <th className="pb-3 pr-4 font-medium">Endpoint</th>
                        <th className="pb-3 pr-4 font-medium">Method</th>
                        <th className="pb-3 font-medium">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="py-4 pr-4 font-mono text-text-body"><code>/health</code></td>
                        <td className="py-4 pr-4"><Badge variant="info" size="sm">GET</Badge></td>
                        <td className="py-4 text-text-secondary">Service health check</td>
                      </tr>
                      <tr>
                        <td className="py-4 pr-4 font-mono text-text-body"><code>/api/v1/validate</code></td>
                        <td className="py-4 pr-4"><Badge variant="info" size="sm">POST</Badge></td>
                        <td className="py-4 text-text-secondary">Compare supplied document lists and expiry dates</td>
                      </tr>
                      <tr><td className="py-4 pr-4 font-mono text-text-body"><code>/api/v1/institutions</code></td><td className="py-4 pr-4"><Badge variant="info" size="sm">GET</Badge></td><td className="py-4 text-text-secondary">List institutions available to the signed-in user</td></tr>
                      <tr><td className="py-4 pr-4 font-mono text-text-body"><code>/api/v1/validation-runs</code></td><td className="py-4 pr-4"><Badge variant="info" size="sm">POST</Badge></td><td className="py-4 text-text-secondary">Validate and save an opted-in history record</td></tr>
                      <tr><td className="py-4 pr-4 font-mono text-text-body"><code>/api/v1/validation-runs</code></td><td className="py-4 pr-4"><Badge variant="info" size="sm">GET</Badge></td><td className="py-4 text-text-secondary">List accessible history with bounded pagination</td></tr>
                      <tr><td className="py-4 pr-4 font-mono text-text-body"><code>/api/v1/validation-runs/&#123;run_id&#125;</code></td><td className="py-4 pr-4"><Badge variant="info" size="sm">GET / DELETE</Badge></td><td className="py-4 text-text-secondary">Open or delete an authorized record</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-sm text-text-secondary">
                  Invalid request bodies return HTTP 422 with FastAPI's <code className="font-mono text-xs text-text-body">detail</code> error array.
                </p>
              </div>

              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <h4 className="font-medium text-text-heading mb-3">Validation Status Values</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="neutral" dot>preliminary_checks_passed</Badge>
                    <Badge variant="warning" dot>attention_required</Badge>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">
                    A passing status means only that the supplied lists agree; it is not an AICTE compliance or authenticity decision.
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium text-text-heading mb-3">Finding Codes</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="error" dot>MISSING_DOCUMENT</Badge>
                    <Badge variant="warning" dot>DOCUMENT_EXPIRED</Badge>
                  </div>
                  <p className="mt-3 text-sm text-text-secondary">
                    Missing-document evidence includes <code className="font-mono text-xs text-text-body">source</code> and <code className="font-mono text-xs text-text-body">observed</code>. Expiry evidence includes <code className="font-mono text-xs text-text-body">source</code>, <code className="font-mono text-xs text-text-body">expiry_date</code>, and <code className="font-mono text-xs text-text-body">evaluation_date</code>.
                  </p>
                </div>
              </div>

              <div className="min-w-0 space-y-5 border-t border-border pt-5">
                <div>
                  <h4 className="mb-3 font-medium text-text-heading">Request Fields</h4>
                  <p className="mb-3 text-sm text-text-secondary">
                    The institution ID must contain 1 to 100 non-blank characters. Required documents need at least one item; document names must be non-blank and unique after trimming. Submitted documents and expiry dates default to empty values.
                  </p>
              <pre tabIndex={0} aria-label="Validation request fields" className="code-example block min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-bg-3 px-4 py-4 text-xs font-mono leading-relaxed text-text-secondary">
{`{
  "institution_id": "string",
  "application_type": "eoa" | "new_program" | "intake_change",
  "required_documents": ["string"],
  "submitted_documents": ["string"],
  "expiry_dates": { "doc_name": "YYYY-MM-DD" }
}`}
                  </pre>
                </div>

                <div className="min-w-0 border-t border-border pt-5">
                  <h4 className="mb-3 font-medium text-text-heading">Response Fields</h4>
                  <pre tabIndex={0} aria-label="Validation response fields" className="code-example block min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-border bg-bg-3 px-4 py-4 text-xs font-mono leading-relaxed text-text-secondary">
{`{
  "institution_id": "string",
  "application_type": "eoa" | "new_program" | "intake_change",
  "status": "preliminary_checks_passed" | "attention_required",
  "validation_scope": "caller_supplied_checklist_only",
  "missing_documents": ["string"],
  "expired_documents": ["string"],
  "findings": [{
    "code": "MISSING_DOCUMENT" | "DOCUMENT_EXPIRED",
    "document_type": "string",
    "message": "string",
    "evidence": { "key": "value" }
  }],
  "checked_at": "ISO-8601 timestamp with UTC offset",
  "source": "synthetic_demo_input",
  "notice": "string"
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exporting a result</CardTitle>
              <CardDescription>Downloads contain only the current validation request and API response.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-text-secondary">
              <p>CSV includes request context, response status and scope, the API checked-at timestamp, a separate report-generation timestamp, findings, evidence, source, and the API limitation notice.</p>
              <p>CSV values are quoted and quotes are escaped. Values that begin with a spreadsheet formula character, including after whitespace, receive a leading apostrophe in the exported cell. The in-page result is unchanged.</p>
              <p>Print Summary opens the browser print dialog. You can choose a PDF destination. Exporting does not extend the saved record's 365-day retention period.</p>
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-5" aria-label="Scope and security information">
          <Card className="border-warning-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning-text" aria-hidden="true" />
                What This Tool Does NOT Do
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-text-secondary">
                <li className="flex gap-2 leading-relaxed"><XCircle className="h-4 w-4 text-error-text flex-shrink-0 mt-0.5" /> Load or evaluate active AICTE rules</li>
                <li className="flex gap-2 leading-relaxed"><XCircle className="h-4 w-4 text-error-text flex-shrink-0 mt-0.5" /> Perform OCR or document upload</li>
                <li className="flex gap-2 leading-relaxed"><XCircle className="h-4 w-4 text-error-text flex-shrink-0 mt-0.5" /> Verify document authenticity</li>
                <li className="flex gap-2 leading-relaxed"><XCircle className="h-4 w-4 text-error-text flex-shrink-0 mt-0.5" /> Replace human compliance review</li>
                <li className="flex gap-2 leading-relaxed"><XCircle className="h-4 w-4 text-error-text flex-shrink-0 mt-0.5" /> Submit filings to AICTE</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-text-muted" aria-hidden="true" />
                Security & Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text-secondary">
              <p className="leading-relaxed">Saved history requires Supabase Auth and a verified institution membership. Database row-level security limits access by user and institution role.</p>
              <p className="leading-relaxed">A history record is created only when a signed-in user opts in. It stores the request and result snapshot and is scheduled for deletion after 365 days.</p>
              <p className="leading-relaxed">Requests contain institution identifiers, document names, expiry dates, and the user account ID. File uploads and OCR are not supported.</p>
              <p className="leading-relaxed">AICTE rules are inactive. The current check remains a caller-supplied list comparison.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-text-muted" aria-hidden="true" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <a href="https://github.com/rajaryan1111/aicte-compliance-ai/blob/main/docs/development/API_CONTRACT.md" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-text-secondary hover:text-text-link transition-colors leading-relaxed">
                <FileText className="h-4 w-4" /> API Contract v0.1.0-draft
              </a>
              <a href="https://www.aicte-india.org/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-text-secondary hover:text-text-link transition-colors leading-relaxed">
                <Shield className="h-4 w-4" aria-hidden="true" /> AICTE website
              </a>
              <a href="https://github.com/rajaryan1111/aicte-compliance-ai" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-text-secondary hover:text-text-link transition-colors leading-relaxed">
                <Server className="h-4 w-4" /> Project Repository
              </a>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
