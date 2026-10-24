import type { ValidationRequest } from "@/lib/api";

export function hasTrimmedDuplicates(values: string[]): boolean {
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (seen.has(normalized)) return true;
    seen.add(normalized);
  }
  return false;
}

export function validateValidationStep(
  form: ValidationRequest,
  step: number,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0 && !form.institution_id.trim()) {
    errors.institution_id = "Institution ID is required.";
  }
  if (step === 1) {
    if (!form.required_documents.length) {
      errors.required_documents = "Add at least one required document.";
    }
    if (hasTrimmedDuplicates(form.required_documents) || hasTrimmedDuplicates(form.submitted_documents)) {
      errors.document_duplicates = "Remove duplicate document names. Names are compared after trimming surrounding whitespace, matching the API.";
    }
  }
  return errors;
}

export function validateCompleteRequest(form: ValidationRequest): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.institution_id.trim()) errors.institution_id = "Institution ID is required.";
  if (!form.required_documents.length) errors.required_documents = "At least one required document is required.";
  if (hasTrimmedDuplicates(form.required_documents) || hasTrimmedDuplicates(form.submitted_documents)) {
    errors.document_duplicates = "Document names must be unique after trimming surrounding whitespace.";
  }
  return errors;
}
