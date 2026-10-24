import { useState, useCallback, useMemo, useRef, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  Shield,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { createSavedValidationRun, validateDocuments, type ValidationRequest, type ValidationResponse, type ApiResult } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { FormField, Input, Select } from "@/components/FormField";
import { DocumentTagInput } from "@/components/DocumentTagInput";
import { ExpiryDateInput } from "@/components/ExpiryDateInput";
import { Alert } from "@/components/Alert";
import { ValidationResults } from "@/components/ValidationResults";
import { ScopeNotice } from "@/components/ScopeNotice";
import { humanizeDocName } from "@/lib/utils";
import { validateCompleteRequest, validateValidationStep } from "@/lib/form-validation";
import { useAuth } from "@/components/useAuth";

type FormState = "form" | "loading" | "success" | "error";

const applicationTypes = [
  { value: "eoa", label: "Extension of Approval (EOA)" },
  { value: "new_program", label: "New Program" },
  { value: "intake_change", label: "Intake Change" },
];

const steps = [
  { title: "Application", description: "Institution and application context" },
  { title: "Documents", description: "Required and submitted document names" },
  { title: "Expiry dates", description: "Optional dates and input review" },
  { title: "Final review", description: "Check the request before sending it" },
];

const initialForm: ValidationRequest = {
  institution_id: "",
  application_type: "eoa",
  required_documents: [],
  submitted_documents: [],
  expiry_dates: {},
};

function ReviewList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-heading">{label}</h3>
      {values.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-body">
          {values.map((value, index) => <li key={`${value}-${index}`} className="break-words">{value}</li>)}
        </ul>
      ) : <p className="mt-2 text-sm text-text-muted">None entered</p>}
    </div>
  );
}

export function ValidatePage() {
  const { session } = useAuth();
  const [formState, setFormState] = useState<FormState>("form");
  const [form, setForm] = useState<ValidationRequest>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [step, setStep] = useState(0);
  const [duplicateNotice, setDuplicateNotice] = useState("");
  const [saveToHistory, setSaveToHistory] = useState(false);
  const [savedRunId, setSavedRunId] = useState<string | null>(null);
  const submissionInProgress = useRef(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const allDocuments = useMemo(() => {
    const docs = new Set([...form.required_documents, ...form.submitted_documents]);
    return Array.from(docs).sort((a, b) => a.localeCompare(b));
  }, [form.required_documents, form.submitted_documents]);

  const validateStep = useCallback((currentStep: number): boolean => {
    const newErrors = validateValidationStep(form, currentStep);
    setErrors((current) => ({ ...current, ...newErrors }));
    if (Object.keys(newErrors).length) {
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return false;
    }
    return true;
  }, [form]);

  const goToStep = (nextStep: number) => {
    if (nextStep > step && !validateStep(step)) return;
    setErrors({});
    setStep(nextStep);
    requestAnimationFrame(() => stepHeadingRef.current?.focus());
  };

  const validateForm = useCallback((): boolean => {
    const newErrors = validateCompleteRequest(form);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submissionInProgress.current) return;
    if (!validateForm()) {
      const invalidStep = !form.institution_id.trim() ? 0 : 1;
      setStep(invalidStep);
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    submissionInProgress.current = true;
    setFormState("loading");
    setApiError(null);
    setSavedRunId(null);
    try {
      let apiResult: ApiResult<ValidationResponse>;
      if (saveToHistory && session) {
        const saved = await createSavedValidationRun(form, session.access_token);
        apiResult = saved.ok
          ? { ok: true, data: saved.data.result }
          : saved;
        if (saved.ok) setSavedRunId(saved.data.id);
      } else {
        apiResult = await validateDocuments(form);
      }
      if (apiResult.ok) {
        setResult(apiResult.data);
        setFormState("success");
      } else if (apiResult.kind === "validation") {
        setErrors(apiResult.errors);
        const failedFields = Object.keys(apiResult.errors);
        const invalidStep = failedFields.some((field) => ["institution_id", "application_type"].includes(field))
          ? 0
          : failedFields.some((field) => field === "expiry_dates") ? 2 : 1;
        setStep(invalidStep);
        setFormState("error");
        requestAnimationFrame(() => errorSummaryRef.current?.focus());
      } else {
        setApiError(
          apiResult.errors._network ?? apiResult.errors._server ?? apiResult.errors._unknown ??
          "An unexpected error occurred"
        );
        setFormState("error");
      }
    } catch {
      setApiError("The request could not be completed. Your entries are still here; try again.");
      setFormState("error");
    } finally {
      submissionInProgress.current = false;
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setErrors({});
    setApiError(null);
    setResult(null);
    setDuplicateNotice("");
    setSaveToHistory(false);
    setSavedRunId(null);
    setStep(0);
    setFormState("form");
  };

  const handleChange = <K extends keyof ValidationRequest>(field: K, value: ValidationRequest[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setApiError(null);
    setFormState((current) => current === "error" ? "form" : current);
    if (errors[field] || errors._unknown) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next._unknown;
        return next;
      });
    }
  };

  const handleTagChange = (field: "required_documents" | "submitted_documents", tags: string[]) => {
    handleChange(field, tags);
    setDuplicateNotice("");
    if (errors.document_duplicates) {
      setErrors((current) => ({ ...current, document_duplicates: "" }));
    }
  };

  const handleExpiryChange = (doc: string, date: string) => {
    setForm((prev) => ({ ...prev, expiry_dates: { ...prev.expiry_dates, [doc]: date } }));
  };

  if (formState === "success" && result) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
        <ScopeNotice />
        {savedRunId && (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-success-border bg-success-bg/30 p-4 text-sm text-text-body" role="status">
            <p>Saved to institution history. This record is retained for up to 365 days.</p>
            <Link to={`/history/${encodeURIComponent(savedRunId)}`} className="font-semibold text-primary-300 underline underline-offset-4">Open saved record</Link>
          </div>
        )}
        <ValidationResults data={result} request={form} onReset={handleReset} />
      </div>
    );
  }

  const errorMessages = Object.entries(errors).filter(([key, value]) => key !== "_unknown" && value);

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-slide-up">
      <section className="space-y-3" aria-labelledby="validation-title">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-300">Validation workspace</p>
        <h1 id="validation-title" className="text-3xl font-bold tracking-tight text-text-heading">Start a new validation</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Compare the required and submitted lists provided with this request and review supplied expiry dates.
        </p>
      </section>

      <ScopeNotice />

      <div className="grid items-start gap-6 xl:gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(17rem,0.9fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary-500/15 p-2">
                <ClipboardCheck className="h-5 w-5 text-primary-400" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>Validation request</CardTitle>
                <CardDescription>Complete each section, then review the request before submission.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ol aria-label="Validation steps" className="grid gap-2 sm:grid-cols-4">
              {steps.map((item, index) => {
                const current = index === step;
                const complete = index < step;
                return (
                  <li key={item.title}>
                    <button
                      type="button"
                      onClick={() => index <= step && goToStep(index)}
                      disabled={index > step || formState === "loading"}
                      aria-current={current ? "step" : undefined}
                      className={`flex min-h-14 w-full items-start gap-2 border-l-2 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-55 ${current ? "border-primary-500 bg-bg-2" : complete ? "border-success-border" : "border-border"}`}
                    >
                      <span className="mt-0.5 text-xs font-semibold text-text-muted">0{index + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-text-heading">{item.title}</span>
                        <span className="mt-0.5 hidden text-xs leading-snug text-text-secondary md:block">{item.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-busy={formState === "loading"}>
              <p className="sr-only" role="status" aria-live="polite">
                {formState === "loading" ? "Validation in progress. Please wait." : ""}
              </p>

              {errorMessages.length > 0 && (
                <div ref={errorSummaryRef} tabIndex={-1} className="border-l-4 border-error-border bg-error-bg/40 p-4 outline-none focus-visible:ring-2 focus-visible:ring-primary-500" role="alert" aria-labelledby="validation-error-title">
                  <h2 id="validation-error-title" className="font-semibold text-error-text">Review this section</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-body">
                    {errorMessages.map(([key, message]) => <li key={key}>{message}</li>)}
                  </ul>
                </div>
              )}

              {apiError && (
                <Alert variant="error" title="Validation failed">
                  <p>{apiError}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={formState === "loading"}>Retry validation</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={handleReset}>Start over</Button>
                  </div>
                </Alert>
              )}
              {errors._unknown && <Alert variant="error" description={errors._unknown} />}
              {errors.document_duplicates && <Alert variant="warning" description={errors.document_duplicates} />}

              <div aria-labelledby="active-step-heading">
                <h2 id="active-step-heading" ref={stepHeadingRef} tabIndex={-1} className="text-lg font-semibold text-text-heading outline-none">{steps[step].title}</h2>
                <p className="mt-1 text-sm text-text-secondary">{steps[step].description}</p>

                {step === 0 && (
                  <div className="mt-5 grid gap-x-5 gap-y-6 sm:grid-cols-2">
                    <FormField label="Institution ID" hint="Use a synthetic identifier, such as SYNTH-001." error={errors.institution_id} required htmlFor="institution_id">
                      <Input id="institution_id" maxLength={100} value={form.institution_id} onChange={(e) => handleChange("institution_id", e.target.value)} placeholder="SYNTH-001" disabled={formState === "loading"} />
                    </FormField>
                    <FormField label="Application type" hint="Select the type supplied for this comparison." error={errors.application_type} required htmlFor="application_type">
                      <Select id="application_type" value={form.application_type} options={applicationTypes} onChange={(v) => handleChange("application_type", v as ValidationRequest["application_type"])} disabled={formState === "loading"} />
                    </FormField>
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-5 grid gap-6">
                    <FormField label="Required documents" hint="Add each document name and press Enter or comma." error={errors.required_documents} required>
                      <DocumentTagInput value={form.required_documents} onChange={(tags) => handleTagChange("required_documents", tags)} onDuplicate={() => setDuplicateNotice("That document name is already in this list. Names are compared after trimming spaces.")} placeholder="For example, land certificate" disabled={formState === "loading"} />
                    </FormField>
                    <FormField label="Submitted documents" hint="Use the names supplied for this request. This does not upload files." error={errors.submitted_documents}>
                      <DocumentTagInput value={form.submitted_documents} onChange={(tags) => handleTagChange("submitted_documents", tags)} onDuplicate={() => setDuplicateNotice("That document name is already in this list. Names are compared after trimming spaces.")} placeholder="For example, building plan" disabled={formState === "loading"} />
                    </FormField>
                    <p className="text-sm text-text-muted" role="status" aria-live="polite">{duplicateNotice}</p>
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-5 space-y-6">
                    <p className="text-sm leading-relaxed text-text-secondary">Expiry dates are optional. The service compares supplied dates with the server’s current UTC date.</p>
                    <ExpiryDateInput documents={allDocuments} values={form.expiry_dates} onChange={handleExpiryChange} disabled={formState === "loading"} />
                    <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
                      <ReviewList label="Required document names" values={form.required_documents} />
                      <ReviewList label="Submitted document names" values={form.submitted_documents} />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="mt-5 space-y-5">
                    <Alert variant="info" title="Preliminary comparison">
                      This sends the names and dates below to the existing validation endpoint. It does not upload or authenticate documents or determine regulatory compliance.
                    </Alert>
                    <dl className="grid gap-4 border-y border-border py-4 sm:grid-cols-2">
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Institution ID</dt><dd className="mt-1 break-words text-sm text-text-heading">{form.institution_id || "Not entered"}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-muted">Application type</dt><dd className="mt-1 text-sm text-text-heading">{applicationTypes.find((item) => item.value === form.application_type)?.label}</dd></div>
                    </dl>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <ReviewList label={`Required documents (${form.required_documents.length})`} values={form.required_documents} />
                      <ReviewList label={`Submitted documents (${form.submitted_documents.length})`} values={form.submitted_documents} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-heading">Expiry dates</h3>
                      {Object.keys(form.expiry_dates).filter((key) => form.expiry_dates[key]).length ? (
                        <ul className="mt-2 space-y-1 text-sm text-text-body">
                          {Object.entries(form.expiry_dates).filter(([, date]) => date).map(([name, date]) => <li key={name} className="break-words">{humanizeDocName(name)}: <time dateTime={date}>{date}</time></li>)}
                        </ul>
                      ) : <p className="mt-2 text-sm text-text-muted">No expiry dates entered</p>}
                    </div>
                    {session ? (
                      <label className="flex items-start gap-3 border-t border-border pt-5 text-sm leading-relaxed text-text-body">
                        <input className="mt-1 h-4 w-4 accent-primary-500" type="checkbox" checked={saveToHistory} onChange={(event) => setSaveToHistory(event.target.checked)} disabled={formState === "loading"} />
                        <span>Save this request and result to institution history. The record is available to you and authorized institution reviewers and is deleted after 365 days.</span>
                      </label>
                    ) : (
                      <p className="border-t border-border pt-5 text-sm leading-relaxed text-text-secondary">
                        To save this run to institution history, <Link to="/signin" className="font-semibold text-primary-300 underline underline-offset-4">sign in with an institution account</Link>. Runs are not saved unless you select the option after signing in.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  {step > 0 && <Button type="button" variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => goToStep(step - 1)} disabled={formState === "loading"}>Back</Button>}
                  <Button type="button" variant="ghost" onClick={handleReset} disabled={formState === "loading"}>Clear form</Button>
                </div>
                {step < steps.length - 1 ? (
                  <Button type="button" rightIcon={<ArrowRight className="h-4 w-4" />} onClick={() => goToStep(step + 1)} disabled={formState === "loading"}>Continue</Button>
                ) : (
                  <Button type="submit" size="lg" loading={formState === "loading"} leftIcon={formState === "loading" ? null : <ClipboardCheck className="h-4 w-4" />}>Run validation</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="min-w-0 space-y-4" aria-label="Validation guidance">
          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary-400" aria-hidden="true" />About this step</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-text-secondary">{steps[step].description}. Your entries stay in this page as you move between steps.</p>
              <ol className="mt-4 space-y-3 text-sm text-text-secondary">
                <li className="flex gap-3"><span className="font-semibold text-text-muted">1</span><span>Enter the institution and application type.</span></li>
                <li className="flex gap-3"><span className="font-semibold text-text-muted">2</span><span>List document names only; no files are uploaded.</span></li>
                <li className="flex gap-3"><span className="font-semibold text-text-muted">3</span><span>Add expiry dates only when they are available.</span></li>
                <li className="flex gap-3"><span className="font-semibold text-text-muted">4</span><span>Review the request before sending it.</span></li>
              </ol>
            </CardContent>
          </Card>
          <Card padding="sm" className="border-warning-border/40">
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-warning-text" aria-hidden="true" />Prototype limits</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-text-secondary">
              <p>The service compares only the lists and dates in this request.</p>
              <p>It does not load an authoritative AICTE checklist or verify authenticity. A history record is stored only when you sign in and choose to save it.</p>
              <p>Use synthetic data in this prototype.</p>
            </CardContent>
          </Card>
          {formState === "error" && <Alert variant="warning" title="Your entries are still here"><p>Correct the issue or retry. The request values have not been cleared.</p></Alert>}
        </aside>
      </div>
    </div>
  );
}
