// Typed API client for AICTE Compliance AI
// Based on docs/development/API_CONTRACT.md v0.1.0-draft

// ── Request types ──────────────────────────────────────────────

export type ApplicationType = "eoa" | "new_program" | "intake_change";

export interface ValidationRequest {
  institution_id: string;
  application_type: ApplicationType;
  required_documents: string[];
  submitted_documents: string[];
  expiry_dates: Record<string, string>;
}

// ── Response types ─────────────────────────────────────────────

export type ValidationStatus = "preliminary_checks_passed" | "attention_required";

export interface Finding {
  code: "MISSING_DOCUMENT" | "DOCUMENT_EXPIRED";
  document_type: string;
  message: string;
  evidence: Record<string, string>;
}

export interface ValidationResponse {
  institution_id: string;
  application_type: string;
  status: ValidationStatus;
  validation_scope: string;
  missing_documents: string[];
  expired_documents: string[];
  findings: Finding[];
  checked_at: string;
  source: string;
  notice: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface InstitutionAccess {
  id: string;
  external_ref: string;
  display_name: string;
  role: "applicant" | "reviewer" | "institution_admin";
}

export interface SavedValidationRun {
  id: string;
  institution_id: string;
  institution_name: string;
  application_type: ApplicationType;
  created_at: string;
  checked_at: string;
  expires_at: string;
  request: ValidationRequest;
  result: ValidationResponse;
}

export interface DocumentCandidateFields {
  expiry_date?: string | null;
  issue_date?: string | null;
  certificate_number?: string | null;
  issuing_authority?: string | null;
}

export interface DocumentAnalysisResponse {
  filename: string;
  filesize_bytes: number;
  sha256: string;
  page_count: number;
  is_scanned_only: boolean;
  extracted_text_preview: string;
  candidate_fields: DocumentCandidateFields;
  warnings: string[];
  notice: string;
}

export interface SavedValidationRunPage {
  items: SavedValidationRun[];
  has_more: boolean;
}

// ── Error types ────────────────────────────────────────────────

export interface ValidationErrorDetail {
  type: string;
  loc: (string | number)[];
  msg: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface ValidationErrorResponse {
  detail: ValidationErrorDetail[];
}

export type ApiFailureKind =
  | "validation"
  | "server"
  | "network"
  | "timeout"
  | "invalid_response";

// ── Error mapping (mirrors frontend/tools/map_errors.py) ──────

export function mapValidationErrors(
  body: unknown
): Record<string, string> {
  if (!body || typeof body !== "object") return {};
  const detail = (body as Record<string, unknown>).detail;
  if (!Array.isArray(detail)) return {};

  const result: Record<string, string> = {};

  for (const entry of detail) {
    if (!entry || typeof entry !== "object") {
      result._unknown = String(entry);
      continue;
    }
    const e = entry as Record<string, unknown>;
    const msg = e.msg;
    if (typeof msg !== "string") continue;

    const loc = e.loc;
    if (!Array.isArray(loc) || loc.length === 0) {
      result._unknown = msg;
      continue;
    }
    const field = loc[loc.length - 1];
    if (typeof field !== "string") {
      result._unknown = msg;
      continue;
    }
    result[field] = msg;
  }
  return result;
}

// ── API client ─────────────────────────────────────────────────
//
// Base URL for the backend. Empty by default: in development the Vite dev
// server proxies `/health` and `/api` to the FastAPI backend; in a split
// deployment set VITE_API_BASE_URL in frontend/app/.env.local (no trailing
// slash, e.g. "https://aicte-backend.example.com").
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      kind: ApiFailureKind;
      status: number;
      errors: Record<string, string>;
      raw?: unknown;
    };

const REQUEST_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidationResponse(value: unknown): value is ValidationResponse {
  if (!isRecord(value)) return false;

  return (
    typeof value.institution_id === "string" &&
    typeof value.application_type === "string" &&
    (value.status === "preliminary_checks_passed" || value.status === "attention_required") &&
    typeof value.validation_scope === "string" &&
    Array.isArray(value.missing_documents) &&
    Array.isArray(value.expired_documents) &&
    Array.isArray(value.findings) &&
    typeof value.checked_at === "string" &&
    typeof value.source === "string" &&
    typeof value.notice === "string"
  );
}

async function fetchJson(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ response: Response; body: unknown; parseError: boolean }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const text = await response.text();

    if (!text.trim()) {
      return { response, body: undefined, parseError: false };
    }

    try {
      return { response, body: JSON.parse(text) as unknown, parseError: false };
    } catch {
      return { response, body: undefined, parseError: true };
    }
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function checkHealth(): Promise<ApiResult<HealthResponse>> {
  try {
    const { response: res, body, parseError } = await fetchJson(apiUrl("/health"));
    if (res.ok && !parseError && isRecord(body) && typeof body.status === "string" && typeof body.service === "string") {
      return { ok: true, data: body as unknown as HealthResponse };
    }
    if (res.ok && (parseError || !isRecord(body))) {
      return {
        ok: false,
        kind: "invalid_response",
        status: res.status,
        errors: { _server: "Health check returned an invalid response." },
      };
    }
    return {
      ok: false,
      kind: "server",
      status: res.status,
      errors: { _server: `Server returned ${res.status}` },
    };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      kind: timedOut ? "timeout" : "network",
      status: 0,
      errors: {
        _network: timedOut
          ? "Health check timed out."
          : "Unable to reach the server. Check your connection.",
      },
    };
  }
}

export async function validateDocuments(
  request: ValidationRequest
): Promise<ApiResult<ValidationResponse>> {
  try {
    const { response: res, body, parseError } = await fetchJson(apiUrl("/api/v1/validate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (res.ok) {
      if (!parseError && isValidationResponse(body)) {
        return { ok: true, data: body };
      }
      return {
        ok: false,
        kind: "invalid_response",
        status: res.status,
        errors: { _server: "Validation service returned an invalid response." },
        raw: body,
      };
    }

    if (res.status === 422) {
      const errors = mapValidationErrors(body);
      return {
        ok: false,
        kind: "validation",
        status: 422,
        errors: Object.keys(errors).length > 0
          ? errors
          : { _unknown: "The request was rejected. Check the form and try again." },
        raw: body,
      };
    }

    return {
      ok: false,
      kind: "server",
      status: res.status,
      errors: {
        _server: parseError
          ? `Validation service returned an unreadable response (${res.status}).`
          : `Validation service returned an error (${res.status}).`,
      },
      raw: body,
    };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      kind: timedOut ? "timeout" : "network",
      status: 0,
      errors: {
        _network: timedOut
          ? "Validation timed out. Check the service and try again."
          : "Unable to reach the validation service. Check your connection and try again.",
      },
    };
  }
}

async function authenticatedJson<T>(
  path: string,
  token: string,
  init: RequestInit = {},
  valid: (body: unknown) => body is T,
): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init.body) headers.set("Content-Type", "application/json");
    const { response, body, parseError } = await fetchJson(apiUrl(path), { ...init, headers });
    if (response.status === 204) return { ok: true, data: undefined as T };
    if (response.ok && !parseError && valid(body)) return { ok: true, data: body };
    if (response.ok) {
      return { ok: false, kind: "invalid_response", status: response.status, errors: { _server: "History service returned an invalid response." }, raw: body };
    }
    const mapped = mapValidationErrors(body);
    return {
      ok: false,
      kind: response.status === 422 ? "validation" : "server",
      status: response.status,
      errors: Object.keys(mapped).length ? mapped : { _server: historyErrorMessage(response.status, body) },
      raw: body,
    };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      kind: timedOut ? "timeout" : "network",
      status: 0,
      errors: { _network: timedOut ? "History request timed out." : "Unable to reach the history service." },
    };
  }
}

function historyErrorMessage(status: number, body: unknown) {
  if (isRecord(body) && typeof body.detail === "string") return body.detail;
  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 403) return "Your account does not have access to this history action.";
  if (status === 404) return "The history record or institution was not found.";
  if (status === 503) return "History is not configured or is temporarily unavailable.";
  return `History service returned an error (${status}).`;
}

function isInstitutionList(value: unknown): value is InstitutionAccess[] {
  return Array.isArray(value) && value.every((item) => isRecord(item)
    && typeof item.id === "string"
    && typeof item.external_ref === "string"
    && typeof item.display_name === "string"
    && ["applicant", "reviewer", "institution_admin"].includes(String(item.role)));
}

function isSavedRun(value: unknown): value is SavedValidationRun {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.institution_id === "string"
    && typeof value.institution_name === "string"
    && typeof value.application_type === "string"
    && typeof value.created_at === "string"
    && typeof value.checked_at === "string"
    && typeof value.expires_at === "string"
    && isRecord(value.request)
    && isValidationResponse(value.result);
}

function isSavedRunPage(value: unknown): value is SavedValidationRunPage {
  return isRecord(value) && Array.isArray(value.items)
    && value.items.every(isSavedRun) && typeof value.has_more === "boolean";
}

export function fetchInstitutions(token: string) {
  return authenticatedJson<InstitutionAccess[]>("/api/v1/institutions", token, {}, isInstitutionList);
}

export function createSavedValidationRun(request: ValidationRequest, token: string) {
  return authenticatedJson<SavedValidationRun>(
    "/api/v1/validation-runs",
    token,
    { method: "POST", body: JSON.stringify(request) },
    isSavedRun,
  );
}

export function fetchValidationRuns(token: string, limit = 25, offset = 0) {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return authenticatedJson<SavedValidationRunPage>(
    `/api/v1/validation-runs?${query.toString()}`,
    token,
    {},
    isSavedRunPage,
  );
}

export function fetchValidationRun(runId: string, token: string) {
  return authenticatedJson<SavedValidationRun>(
    `/api/v1/validation-runs/${encodeURIComponent(runId)}`,
    token,
    {},
    isSavedRun,
  );
}

export function deleteValidationRun(runId: string, token: string) {
  return authenticatedJson<{ ok: true }>(
    `/api/v1/validation-runs/${encodeURIComponent(runId)}`,
    token,
    { method: "DELETE" },
    (body): body is { ok: true } => body === null,
  );
}

export async function analyzeDocument(file: File): Promise<ApiResult<DocumentAnalysisResponse>> {
  if (file.size > 10 * 1024 * 1024) {
    return {
      ok: false,
      kind: "validation",
      status: 413,
      errors: { file: "File exceeds maximum permitted size of 10 MiB." },
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(apiUrl("/api/v1/documents/analyze"), {
      method: "POST",
      body: formData,
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body && typeof body === "object") {
      return { ok: true, data: body as DocumentAnalysisResponse };
    }
    const detail = (body && typeof (body as Record<string, unknown>).detail === "string")
      ? (body as Record<string, unknown>).detail as string
      : `Document analysis failed (${res.status}).`;
    return {
      ok: false,
      kind: res.status >= 500 ? "server" : "validation",
      status: res.status,
      errors: { file: detail },
      raw: body,
    };
  } catch (_error) {
    return {
      ok: false,
      kind: "network",
      status: 0,
      errors: { file: "Unable to reach the document analysis service. Please check backend connection." },
    };
  }
}

