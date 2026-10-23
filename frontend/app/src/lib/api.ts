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
    const { response: res, body, parseError } = await fetchJson("/health");
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
    const { response: res, body, parseError } = await fetchJson("/api/v1/validate", {
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
