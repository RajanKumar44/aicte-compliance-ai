import {
  createSavedValidationRun as apiCreateSaved,
  fetchValidationRuns as apiFetchRuns,
  fetchValidationRun as apiFetchRun,
  deleteValidationRun as apiDeleteRun,
  type SavedValidationRun,
  type ValidationRequest,
  type ValidationResponse,
  type ApiResult,
} from "./api";
import type { Session } from "@supabase/supabase-js";

export async function saveRunUnified(
  request: ValidationRequest,
  _result: ValidationResponse,
  auth: { session: Session | null }
): Promise<ApiResult<SavedValidationRun>> {
  if (!auth.session?.access_token) {
    return {
      ok: false,
      kind: "validation",
      status: 401,
      errors: { auth: "You must be signed in with an authorized institutional account to save audit history." },
    };
  }

  return apiCreateSaved(request, auth.session.access_token);
}

export async function fetchRunsUnified(
  auth: { session: Session | null },
  limit = 25,
  offset = 0
): Promise<ApiResult<{ items: SavedValidationRun[]; has_more: boolean }>> {
  if (!auth.session?.access_token) {
    return {
      ok: false,
      kind: "validation",
      status: 401,
      errors: { auth: "Sign in with an authorized institutional account to view audit records." },
    };
  }

  return apiFetchRuns(auth.session.access_token, limit, offset);
}

export async function fetchRunByIdUnified(
  id: string,
  auth: { session: Session | null }
): Promise<ApiResult<SavedValidationRun>> {
  if (!auth.session?.access_token) {
    return {
      ok: false,
      kind: "validation",
      status: 401,
      errors: { auth: "Sign in with an authorized institutional account to view this audit record." },
    };
  }

  return apiFetchRun(id, auth.session.access_token);
}

export async function deleteRunUnified(
  id: string,
  auth: { session: Session | null }
): Promise<ApiResult<{ ok: true }>> {
  if (!auth.session?.access_token) {
    return {
      ok: false,
      kind: "validation",
      status: 401,
      errors: { auth: "Sign in with an authorized institutional account to delete audit records." },
    };
  }

  return apiDeleteRun(id, auth.session.access_token);
}

function escapeCsvCell(text: string): string {
  let value = text.replace(/"/g, '""');
  if (/^[=+\-@]/.test(value.trimStart())) {
    value = `'${value}`;
  }
  return `"${value}"`;
}

export function exportRunsAsCsv(runs: SavedValidationRun[]): string {
  const headers = [
    "Run ID",
    "Institution ID",
    "Institution Name",
    "Application Type",
    "Status",
    "Checked At (UTC)",
    "Missing Count",
    "Expired Count",
    "Total Findings",
  ];

  const rows = runs.map((run) => [
    escapeCsvCell(run.id),
    escapeCsvCell(run.institution_id),
    escapeCsvCell(run.institution_name),
    escapeCsvCell(run.application_type),
    escapeCsvCell(run.result?.status || "unknown"),
    escapeCsvCell(run.checked_at || run.created_at),
    escapeCsvCell(String(run.result?.missing_documents?.length || 0)),
    escapeCsvCell(String(run.result?.expired_documents?.length || 0)),
    escapeCsvCell(String(run.result?.findings?.length || 0)),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
}
