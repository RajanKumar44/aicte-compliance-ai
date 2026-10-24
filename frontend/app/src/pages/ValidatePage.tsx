import { useState, useCallback, useMemo, type FormEvent } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Shield,
  HelpCircle,
} from "lucide-react";
import { validateDocuments, type ValidationRequest, type ValidationResponse, type ApiResult } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { FormField, Input, Select } from "@/components/FormField";
import { DocumentTagInput } from "@/components/DocumentTagInput";
import { ExpiryDateInput } from "@/components/ExpiryDateInput";
import { Alert } from "@/components/Alert";
import { ValidationResults } from "@/components/ValidationResults";
import { ScopeNotice } from "@/components/ScopeNotice";

type FormState = "form" | "loading" | "success" | "error";

const applicationTypes = [
  { value: "eoa", label: "Extension of Approval (EOA)" },
  { value: "new_program", label: "New Program" },
  { value: "intake_change", label: "Intake Change" },
];

const initialForm: ValidationRequest = {
  institution_id: "",
  application_type: "eoa",
  required_documents: [],
  submitted_documents: [],
  expiry_dates: {},
};

export function ValidatePage() {
  const [formState, setFormState] = useState<FormState>("form");
  const [form, setForm] = useState<ValidationRequest>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResponse | null>(null);

  const allDocuments = useMemo(() => {
    const docs = new Set([...form.required_documents, ...form.submitted_documents]);
    return Array.from(docs).sort();
  }, [form.required_documents, form.submitted_documents]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.institution_id.trim()) {
      newErrors.institution_id = "Institution ID is required";
    }

    if (form.required_documents.length === 0) {
      newErrors.required_documents = "At least one required document is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormState("loading");
    setApiError(null);

    const apiResult: ApiResult<ValidationResponse> = await validateDocuments(form);

    if (apiResult.ok) {
      setResult(apiResult.data);
      setFormState("success");
    } else {
      if (apiResult.kind === "validation") {
        setErrors(apiResult.errors);
        setFormState("error");
      } else {
        setApiError(
          apiResult.errors._network ??
            apiResult.errors._server ??
            apiResult.errors._unknown ??
            "An unexpected error occurred"
        );
        setFormState("error");
      }
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setErrors({});
    setApiError(null);
    setResult(null);
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
  };

  const handleExpiryChange = (doc: string, date: string) => {
    setForm((prev) => ({
      ...prev,
      expiry_dates: { ...prev.expiry_dates, [doc]: date },
    }));
  };

  if (formState === "success" && result) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
        <ScopeNotice />
        <ValidationResults data={result} request={form} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-9 animate-slide-up">
      <section className="space-y-3" aria-labelledby="validation-title">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-300">Validation workspace</p>
        <h1 id="validation-title" className="text-3xl font-bold tracking-tight text-text-heading">Start a new validation</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Compare the required and submitted lists provided with this request and review supplied expiry dates.
        </p>
      </section>

      <ScopeNotice />

      <div className="grid items-start gap-6 xl:gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(17rem,0.9fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-lg">
                  <ClipboardCheck className="h-5 w-5 text-primary-400" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle>Validation Request</CardTitle>
                  <CardDescription>
                    Enter an institution identifier and the document lists for this comparison.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-busy={formState === "loading"}>
                <p className="sr-only" role="status" aria-live="polite">
                  {formState === "loading" ? "Validation in progress. Please wait." : ""}
                </p>
                {apiError && (
                  <Alert variant="error" title="Validation Failed">
                    <p>{apiError}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="submit" size="sm" disabled={formState === "loading"}>
                        Retry validation
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
                        Start over
                      </Button>
                    </div>
                  </Alert>
                )}

                {errors._unknown && (
                  <Alert variant="error" description={errors._unknown} />
                )}

                <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
                  <FormField
                    label="Institution ID"
                    hint="Enter the institution identifier (e.g., SYNTH-001)"
                    error={errors.institution_id}
                    required
                    htmlFor="institution_id"
                  >
                    <Input
                      id="institution_id"
                      value={form.institution_id}
                      onChange={(e) => handleChange("institution_id", e.target.value)}
                      placeholder="SYNTH-001"
                      disabled={formState === "loading"}
                    />
                  </FormField>

                  <FormField
                    label="Application Type"
                    error={errors.application_type}
                    required
                    htmlFor="application_type"
                  >
                    <Select
                      id="application_type"
                      value={form.application_type}
                      options={applicationTypes}
                      onChange={(v) => handleChange("application_type", v as ValidationRequest["application_type"])}
                      disabled={formState === "loading"}
                    />
                  </FormField>
                </div>

                <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
                  <FormField
                    label="Required Documents"
                    hint="Press Enter or comma to add each document"
                    error={errors.required_documents}
                    required
                  >
                    <DocumentTagInput
                      value={form.required_documents}
                      onChange={(tags) => handleTagChange("required_documents", tags)}
                      placeholder="e.g., land_certificate, fire_safety_cert"
                      disabled={formState === "loading"}
                    />
                  </FormField>

                  <FormField
                    label="Submitted Documents"
                    hint="Press Enter or comma to add each document"
                    error={errors.submitted_documents}
                  >
                    <DocumentTagInput
                      value={form.submitted_documents}
                      onChange={(tags) => handleTagChange("submitted_documents", tags)}
                      placeholder="e.g., land_certificate, building_plan"
                      disabled={formState === "loading"}
                    />
                  </FormField>
                </div>

                <ExpiryDateInput
                  documents={allDocuments}
                  values={form.expiry_dates}
                  onChange={handleExpiryChange}
                  disabled={formState === "loading"}
                />

                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border">
                  <Button
                    type="submit"
                    size="lg"
                    loading={formState === "loading"}
                    leftIcon={formState === "loading" ? null : <ClipboardCheck className="h-4 w-4" />}
                    className="sm:flex-1"
                  >
                    {formState === "loading" ? "Validating…" : "Run Validation"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={handleReset}
                    disabled={formState === "loading"}
                    className="sm:flex-1"
                  >
                    Clear Form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4" aria-label="Validation form guidance">
          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary-400" aria-hidden="true" />
                How to Fill This Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-text-secondary">
                <li className="flex gap-3 leading-relaxed">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center">1</span>
                  <span>Enter your institution identifier (synthetic IDs like SYNTH-001)</span>
                </li>
                <li className="flex gap-3 leading-relaxed">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center">2</span>
                  <span>Select the application type from the dropdown</span>
                </li>
                <li className="flex gap-3 leading-relaxed">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center">3</span>
                  <span>Add required documents: one per line, press Enter after each</span>
                </li>
                <li className="flex gap-3 leading-relaxed">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center">4</span>
                  <span>Add submitted documents the same way</span>
                </li>
                <li className="flex gap-3 leading-relaxed">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center">5</span>
                  <span>Optionally set expiry dates for any document</span>
                </li>
                <li className="flex gap-3 leading-relaxed">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center">6</span>
                  <span>Run the comparison to review missing or expired items</span>
                </li>
              </ol>
            </CardContent>
          </Card>

          <Card padding="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-warning-text" aria-hidden="true" />
                Before You Submit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-text-secondary">
                <li className="flex gap-2 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-success-text flex-shrink-0" aria-hidden="true" />
                  <span>Institution ID must not be empty</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-success-text flex-shrink-0" aria-hidden="true" />
                  <span>At least one required document is needed</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-success-text flex-shrink-0" aria-hidden="true" />
                  <span>Document names are normalized (lowercase, underscores)</span>
                </li>
                <li className="flex gap-2 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-success-text flex-shrink-0" aria-hidden="true" />
                  <span>Expiry dates are optional but recommended</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card padding="sm" className="bg-warning-bg/20 border-warning-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning-text" aria-hidden="true" />
                Demo Data Only
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary leading-relaxed">
                This prototype uses synthetic institution identifiers. No real data is processed or stored.
                Results are for demonstration and review purposes only.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

    </div>
  );
}
