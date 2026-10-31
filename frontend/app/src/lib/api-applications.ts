// Typed API client for the application-centric workflow.
// Mirrors the backend contract in backend/app/application_service.py and
// the endpoints registered in backend/app/main.py.

import { apiUrl } from "./api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  item_id: string;
  label: string;
  rule_id: string;
  rule_id_versioned: string;
  status: "mandatory" | "conditional" | "not_applicable" | "pending_configuration";
  requires_expiry: boolean;
  requires_certificate_number: boolean;
  description: string;
  source_note: string;
}

export interface ApplicationRecord {
  id: string;
  institution_id: string;
  institution_external_ref: string;
  created_by: string;
  application_type: "eoa" | "new_program" | "intake_change";
  academic_year: string;
  params: Record<string, unknown>;
  checklist: ChecklistItem[];
  status: string;
  created_at: string;
  expires_at: string | null;
}

export interface ApplicationFinding {
  id: string;
  application_id: string;
  code: string;
  severity: "critical" | "high" | "medium" | "info";
  rule_id: string;
  message: string;
  evidence: Record<string, unknown>;
  recommended_action: string;
  status: "open" | "resolved" | "rejected" | "escalated";
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface InstitutionRef {
  id: string;
  external_ref: string;
  display_name: string;
}

export interface ApplicationDocument {
  id: string;
  filename: string;
  filezie_bytes?: number;
  filesize_bytes?: number;
  sha256: string;
  scan_status: string;
  document_type: string;
  extracted_metadata: {
    ocr_status?: string;
    scan_status?: string;
    requires_human_review?: boolean;
    is_scanned_only?: boolean;
    sha256?: string;
    fields?: Record<string, { value?: string | null; confidence?: number | null; page_number?: number | null; evidence_text?: string | null }>;
    candidate_fields?: Record<string, string | null>;
  };
  scan_details?: string;
  created_at: string;
  expires_at?: string;
  application_link?: { application_id: string; checklist_item_id: string | null };
}

// ── Error mapping (same envelope as the other API clients) ────────────────

export interface ApiClientError {
  status: number;
  message: string;
  errors?: Record<string, string>;
}

async function readError(response: Response): Promise<ApiClientError> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && typeof (body as Record<string, unknown>).detail === "string") {
      return { status: response.status, message: (body as { detail: string }).detail };
    }
  } catch {
    // fall through
  }
  return {
    status: response.status,
    message: `Request failed with status ${response.status}.`,
  };
}

async function authedFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(apiUrl(path), { ...init, headers });
}

// ── Applications ───────────────────────────────────────────────────────────

export interface CreateApplicationInput {
  institution_id: string;
  application_type: "eoa" | "new_program" | "intake_change";
  academic_year: string;
  params: { hostel?: boolean; new_building?: boolean };
}

export async function createApplication(input: CreateApplicationInput, token: string): Promise<ApplicationRecord> {
  const response = await authedFetch("/api/v1/applications", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ApplicationRecord;
}

export async function listApplications(token: string): Promise<ApplicationRecord[]> {
  const response = await authedFetch("/api/v1/applications", token, { method: "GET" });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ApplicationRecord[];
}

export async function getApplication(applicationId: string, token: string): Promise<ApplicationRecord> {
  const response = await authedFetch(`/api/v1/applications/${encodeURIComponent(applicationId)}`, token);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ApplicationRecord;
}

export async function listApplicationDocuments(applicationId: string, token: string): Promise<ApplicationDocument[]> {
  const response = await authedFetch(`/api/v1/applications/${encodeURIComponent(applicationId)}/documents`, token);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ApplicationDocument[];
}

// NOTE: FormData must stay body-only; Content-Type with boundary is set by the browser.
export function uploadApplicationDocument(
  applicationId: string,
  token: string,
  file: File,
  checklistItemId: string | null,
): Promise<ApplicationDocument> {
  const form = new FormData();
  form.append("file", file);
  form.append("application_id", applicationId);
  if (checklistItemId) {
    form.append("checklist_item_id", checklistItemId);
    form.append("document_type", checklistItemId);
  }
  return authedFetch("/api/v1/documents", token, { method: "POST", body: form }).then(async (response) => {
    if (!response.ok) throw await readError(response);
    return (await response.json()) as ApplicationDocument;
  });
}

export async function runApplicationValidation(
  applicationId: string,
  token: string,
): Promise<ApplicationFinding[]> {
  const response = await authedFetch(`/api/v1/applications/${encodeURIComponent(applicationId)}/validate`, token, {
    method: "POST",
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ApplicationFinding[];
}

export async function listApplicationFindings(
  applicationId: string,
  token: string,
): Promise<ApplicationFinding[]> {
  const response = await authedFetch(`/api/v1/applications/${encodeURIComponent(applicationId)}/findings`, token);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ApplicationFinding[];
}

export interface FindingReviewInput {
  decision: "resolve" | "reject" | "escalate";
  rationale: string;
}

export async function reviewApplicationFinding(
  applicationId: string,
  findingId: string,
  input: FindingReviewInput,
  token: string,
): Promise<ApplicationFinding> {
  const response = await authedFetch(
    `/api/v1/applications/${encodeURIComponent(applicationId)}/findings/${encodeURIComponent(findingId)}/review`,
    token,
    { method: "POST", body: JSON.stringify(input) },
  );
  if (!response.ok) throw await readError(response);
  return (await response.json()) as ApplicationFinding;
}

export async function downloadApplicationReport(applicationId: string, token: string): Promise<void> {
  const response = await authedFetch(`/api/v1/applications/${encodeURIComponent(applicationId)}/report`, token);
  if (!response.ok) throw await readError(response);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `preliminary-report-${applicationId}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
