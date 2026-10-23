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

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; errors: Record<string, string>; raw?: unknown };

export async function checkHealth(): Promise<ApiResult<HealthResponse>> {
  try {
    const res = await fetch("/health");
    if (res.ok) {
      return { ok: true, data: await res.json() };
    }
    return { ok: false, status: res.status, errors: { _server: `Server returned ${res.status}` } };
  } catch {
    return { ok: false, status: 0, errors: { _network: "Unable to reach the server. Check your connection." } };
  }
}

export async function validateDocuments(
  request: ValidationRequest
): Promise<ApiResult<ValidationResponse>> {
  try {
    const res = await fetch("/api/v1/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const body = await res.json();

    if (res.ok) {
      return { ok: true, data: body as ValidationResponse };
    }

    if (res.status === 422) {
      return {
        ok: false,
        status: 422,
        errors: mapValidationErrors(body),
        raw: body,
      };
    }

    return {
      ok: false,
      status: res.status,
      errors: { _server: `Server error (${res.status})` },
      raw: body,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      errors: { _network: "Unable to reach the server. Check your connection and try again." },
    };
  }
}
