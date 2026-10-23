import { useState, type FormEvent } from "react";
import {
  ClipboardCheck, Send, ArrowLeft, RefreshCw, ListChecks, CalendarClock, ShieldCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Button } from "@/components/Button";
import { FormField, Input, Select } from "@/components/FormField";
import { DocumentTagInput } from "@/components/DocumentTagInput";
import { ExpiryDateInput } from "@/components/ExpiryDateInput";
import { Alert } from "@/components/Alert";
import { ScopeNotice } from "@/components/ScopeNotice";
import { ValidationResults } from "@/components/ValidationResults";
import { PageHeader } from "@/components/PageHeader";
import {
  validateDocuments,
  type ValidationRequest,
  type ValidationResponse,
  type ApplicationType,
} from "@/lib/api";

type PageState = "form" | "loading" | "success" | "error";

export function ValidatePage() {
  // Form state
  const [institutionId, setInstitutionId] = useState("");
  const [applicationType, setApplicationType] = useState<ApplicationType>("eoa");
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [submittedDocs, setSubmittedDocs] = useState<string[]>([]);
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});

  // UI state
  const [pageState, setPageState] = useState<PageState>("form");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<ValidationResponse | null>(null);

  const allDocs = [...new Set([...requiredDocs, ...submittedDocs])];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setServerError("");

    // Client-side pre-check
    if (!institutionId.trim()) {
      setFieldErrors({ institution_id: "Institution ID is required." });
      return;
    }
    if (requiredDocs.length === 0) {
      setFieldErrors({ required_documents: "Add at least one required document." });
      return;
    }

    setPageState("loading");

    const request: ValidationRequest = {
      institution_id: institutionId.trim(),
      application_type: applicationType,
      required_documents: requiredDocs,
      submitted_documents: submittedDocs,
      expiry_dates: Object.fromEntries(
        Object.entries(expiryDates).filter(([, v]) => v !== "")
      ),
    };

    const apiResult = await validateDocuments(request);

    if (apiResult.ok) {
      setResult(apiResult.data);
      setPageState("success");
    } else if (apiResult.kind === "validation") {
      setFieldErrors(apiResult.errors);
      setPageState("form");
    } else if (apiResult.kind === "network" || apiResult.kind === "timeout") {
      setServerError(apiResult.errors._network || "Network error.");
      setPageState("error");
    } else {
      setServerError(apiResult.errors._server || `Server error (${apiResult.status})`);
      setPageState("error");
    }
  }

  function handleReset() {
    setInstitutionId("");
    setApplicationType("eoa");
    setRequiredDocs([]);
    setSubmittedDocs([]);
    setExpiryDates({});
    setFieldErrors({});
    setServerError("");
    setResult(null);
    setPageState("form");
  }

  function handleRetry() {
    setServerError("");
    setPageState("form");
  }

  // ── Results view ─────────────────────────────────────────────
  if (pageState === "success" && result) {
    return <ValidationResults data={result} onReset={handleReset} />;
  }

  // ── Error view (network/server) ──────────────────────────────
  if (pageState === "error") {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          eyebrow="Preliminary validation"
          title="Validation service unavailable"
          description="Your entered values are still available. Retry the request when the validation service is reachable."
        />
        <Alert variant="error" title="Unable to complete this check">
          {serverError}
        </Alert>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleRetry} variant="primary" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Button onClick={handleReset} variant="secondary" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  // ── Form view ────────────────────────────────────────────────
  const isLoading = pageState === "loading";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Preliminary validation"
        title="Check a supplied document list"
        description="Compare the required and submitted lists you provide. The service does not verify authenticity or make an official AICTE decision."
      />
      <ScopeNotice />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.65fr)] lg:items-start">
      <Card className="p-5 shadow-sm sm:p-7">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Validation Request</CardTitle>
              <CardDescription>
                Enter the institution details and document lists to validate.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={isLoading}>
          <div className="sr-only" role="status" aria-live="polite">
            {isLoading ? "Checking the supplied document lists." : ""}
          </div>
          {/* General error */}
          {fieldErrors._unknown && (
            <Alert variant="error">{fieldErrors._unknown}</Alert>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Institution ID */}
            <FormField
              label="Institution ID"
              htmlFor="institution_id"
              required
              error={fieldErrors.institution_id}
              hint="1–100 characters"
            >
              <Input
                id="institution_id"
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                placeholder="e.g. SYNTH-INST-001"
                disabled={isLoading}
                aria-invalid={!!fieldErrors.institution_id}
                aria-describedby={`institution_id-${fieldErrors.institution_id ? "error" : "hint"}`}
                maxLength={100}
              />
            </FormField>

            {/* Application Type */}
            <FormField
              label="Application Type"
              htmlFor="application_type"
              required
              error={fieldErrors.application_type}
            >
              <Select
                id="application_type"
                value={applicationType}
                onChange={(e) => setApplicationType(e.target.value as ApplicationType)}
                disabled={isLoading}
                aria-invalid={!!fieldErrors.application_type}
                aria-describedby={fieldErrors.application_type ? "application_type-error" : undefined}
              >
                <option value="eoa">Extension of Approval (EOA)</option>
                <option value="new_program">New Program</option>
                <option value="intake_change">Intake Change</option>
              </Select>
            </FormField>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Required Documents */}
            <FormField
              label="Required Documents"
              htmlFor="required_documents"
              required
              error={fieldErrors.required_documents}
              hint="Add at least one item. Type a document name and press Enter."
            >
              <DocumentTagInput
                id="required_documents"
                value={requiredDocs}
                onChange={setRequiredDocs}
                disabled={isLoading}
                error={!!fieldErrors.required_documents}
                ariaLabel="Add a required document"
                describedBy={`required_documents-${fieldErrors.required_documents ? "error" : "hint"}`}
              />
            </FormField>

            {/* Submitted Documents */}
            <FormField
              label="Submitted Documents"
              htmlFor="submitted_documents"
              error={fieldErrors.submitted_documents}
              hint="Documents that have been submitted"
            >
              <DocumentTagInput
                id="submitted_documents"
                value={submittedDocs}
                onChange={setSubmittedDocs}
                disabled={isLoading}
                error={!!fieldErrors.submitted_documents}
                ariaLabel="Add a submitted document"
                describedBy={`submitted_documents-${fieldErrors.submitted_documents ? "error" : "hint"}`}
              />
            </FormField>
          </div>

          {/* Expiry Dates */}
          {allDocs.length > 0 && (
            <FormField
              label="Expiry Dates (Optional)"
              htmlFor="expiry_dates"
              error={fieldErrors.expiry_dates}
              hint="Add known expiry dates for documents"
            >
              <ExpiryDateInput
                id="expiry_dates"
                documents={allDocs}
                value={expiryDates}
                onChange={setExpiryDates}
                disabled={isLoading}
                error={!!fieldErrors.expiry_dates}
                describedBy={`expiry_dates-${fieldErrors.expiry_dates ? "error" : "hint"}`}
              />
            </FormField>
          )}

          {/* Submit */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="submit"
              loading={isLoading}
              disabled={requiredDocs.length === 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isLoading ? "Validating…" : "Validate Documents"}
            </Button>
            {requiredDocs.length === 0 && !isLoading && (
              <p className="text-sm text-slate-600 sm:self-center">
                Add at least one required document to continue.
              </p>
            )}
            {(institutionId || requiredDocs.length > 0) && !isLoading && (
              <Button type="button" variant="ghost" onClick={handleReset}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </Card>

      <aside className="space-y-6">
        <Card className="p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-navy-900">Build the comparison</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Add the checklist you want to compare, then add the items that were supplied.
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm text-slate-700">
            <li className="flex gap-2"><span className="text-teal-700">01</span><span>Required names define the comparison set.</span></li>
            <li className="flex gap-2"><span className="text-teal-700">02</span><span>Submitted names are matched exactly after input normalization.</span></li>
            <li className="flex gap-2"><span className="text-teal-700">03</span><span>Expiry dates are optional and caller-supplied.</span></li>
          </ul>
        </Card>

        <Card className="border-slate-200 bg-slate-100/70 p-6 shadow-none">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
            <div>
              <h2 className="text-sm font-semibold text-navy-900">Before you submit</h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Review the names and dates you entered. The service reports observations from these inputs; it does not independently verify them.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-teal-200 bg-teal-50/70 p-6 shadow-none">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-800" />
            <div>
              <h2 className="text-sm font-semibold text-navy-900">Safe for demonstration data</h2>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Use synthetic identifiers only. Do not submit real institutional documents or personal data to this prototype.
              </p>
            </div>
          </div>
        </Card>
      </aside>
      </div>
    </div>
  );
}
