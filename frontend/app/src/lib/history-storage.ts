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

const LOCAL_STORAGE_KEY = "aicte_local_validation_runs_v1";

function getLocalRuns(): SavedValidationRun[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedValidationRun[]) : [];
  } catch {
    return [];
  }
}

function persistLocalRuns(runs: SavedValidationRun[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // Ignore quota or private mode errors
  }
}

function saveLocalRun(run: SavedValidationRun): void {
  const current = getLocalRuns();
  const filtered = current.filter((item) => item.id !== run.id);
  persistLocalRuns([run, ...filtered]);
}

function removeLocalRun(id: string): void {
  const current = getLocalRuns();
  persistLocalRuns(current.filter((item) => item.id !== id));
}

export async function saveRunUnified(
  request: ValidationRequest,
  result: ValidationResponse,
  auth: { session: Session | null }
): Promise<ApiResult<SavedValidationRun>> {
  const localRun: SavedValidationRun = {
    id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    institution_id: request.institution_id,
    institution_name: request.institution_id,
    application_type: request.application_type,
    created_at: new Date().toISOString(),
    checked_at: result.checked_at || new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    request,
    result,
  };

  saveLocalRun(localRun);

  if (auth.session?.access_token) {
    try {
      const serverResult = await apiCreateSaved(request, auth.session.access_token);
      if (serverResult.ok) {
        saveLocalRun(serverResult.data);
        return serverResult;
      }
    } catch {
      // Fallback to local
    }
  }

  return { ok: true, data: localRun };
}

export async function fetchRunsUnified(
  auth: { session: Session | null },
  limit = 25,
  offset = 0
): Promise<ApiResult<{ items: SavedValidationRun[]; has_more: boolean }>> {
  const localItems = getLocalRuns();

  if (auth.session?.access_token) {
    try {
      const serverResult = await apiFetchRuns(auth.session.access_token, limit, offset);
      if (serverResult.ok && serverResult.data.items.length > 0) {
        // Merge and deduplicate
        const serverIds = new Set(serverResult.data.items.map((i) => i.id));
        const merged = [
          ...serverResult.data.items,
          ...localItems.filter((i) => !serverIds.has(i.id)),
        ];
        return {
          ok: true,
          data: {
            items: merged.slice(offset, offset + limit),
            has_more: serverResult.data.has_more || offset + limit < merged.length,
          },
        };
      }
    } catch {
      // Fallback to local items
    }
  }

  const sliced = localItems.slice(offset, offset + limit);
  return {
    ok: true,
    data: {
      items: sliced,
      has_more: offset + limit < localItems.length,
    },
  };
}

export async function fetchRunByIdUnified(
  id: string,
  auth: { session: Session | null }
): Promise<ApiResult<SavedValidationRun>> {
  const localItems = getLocalRuns();
  const localFound = localItems.find((item) => item.id === id);
  if (localFound) {
    return { ok: true, data: localFound };
  }

  if (auth.session?.access_token) {
    return apiFetchRun(id, auth.session.access_token);
  }

  return {
    ok: false,
    kind: "validation",
    status: 404,
    errors: { not_found: "Validation record not found." },
  };
}

export async function deleteRunUnified(
  id: string,
  auth: { session: Session | null }
): Promise<ApiResult<{ ok: true }>> {
  removeLocalRun(id);

  if (auth.session?.access_token) {
    try {
      await apiDeleteRun(id, auth.session.access_token);
    } catch {
      // Best-effort remote delete
    }
  }

  return { ok: true, data: { ok: true } };
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
