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
import type { DemoUser } from "@/components/auth-context";
import type { Session } from "@supabase/supabase-js";

const LOCAL_HISTORY_KEY = "aicte_validation_history_local_v1";

function getLocalRuns(): SavedValidationRun[] {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalRuns(runs: SavedValidationRun[]) {
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(runs));
  } catch {
    // quota exceeded or private mode
  }
}

export async function saveRunUnified(
  request: ValidationRequest,
  result: ValidationResponse,
  auth: { session: Session | null; demoUser?: DemoUser | null }
): Promise<ApiResult<SavedValidationRun>> {
  // If remote Supabase session is available, try remote first
  if (auth.session?.access_token) {
    try {
      const remote = await apiCreateSaved(request, auth.session.access_token);
      if (remote.ok) {
        return remote;
      }
    } catch {
      // Fallback to local storage if server is unconfigured or network issue
    }
  }

  // Local / Demo fallback
  const now = new Date();
  const expires = new Date();
  expires.setDate(expires.getDate() + 365);

  const localRecord: SavedValidationRun = {
    id: `local-run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    institution_id: request.institution_id || auth.demoUser?.institution_id || "SYNTH-INST-001",
    institution_name:
      auth.demoUser?.institution_name || `Institution (${request.institution_id || "SYNTH-INST-001"})`,
    application_type: request.application_type,
    created_at: now.toISOString(),
    checked_at: result.checked_at || now.toISOString(),
    expires_at: expires.toISOString(),
    request,
    result,
  };

  const runs = getLocalRuns();
  runs.unshift(localRecord);
  setLocalRuns(runs);

  return { ok: true, data: localRecord };
}

export async function fetchRunsUnified(
  auth: { session: Session | null; demoUser?: DemoUser | null },
  limit = 25,
  offset = 0
): Promise<ApiResult<{ items: SavedValidationRun[]; has_more: boolean }>> {
  if (auth.session?.access_token) {
    try {
      const remote = await apiFetchRuns(auth.session.access_token, limit, offset);
      if (remote.ok) {
        // Also combine any local runs so nothing is ever missed
        const local = getLocalRuns();
        const combined = [...remote.data.items];
        for (const loc of local) {
          if (!combined.some((item) => item.id === loc.id)) {
            combined.unshift(loc);
          }
        }
        return {
          ok: true,
          data: {
            items: combined.slice(offset, offset + limit),
            has_more: combined.length > offset + limit,
          },
        };
      }
    } catch {
      // fallback to local
    }
  }

  const all = getLocalRuns();
  const slice = all.slice(offset, offset + limit);
  return {
    ok: true,
    data: {
      items: slice,
      has_more: all.length > offset + limit,
    },
  };
}

export async function fetchRunByIdUnified(
  id: string,
  auth: { session: Session | null; demoUser?: DemoUser | null }
): Promise<ApiResult<SavedValidationRun>> {
  // Check local first if it starts with local-run- or in local runs
  const local = getLocalRuns();
  const foundLocal = local.find((item) => item.id === id);
  if (foundLocal) {
    return { ok: true, data: foundLocal };
  }

  if (auth.session?.access_token) {
    try {
      const remote = await apiFetchRun(id, auth.session.access_token);
      if (remote.ok) return remote;
    } catch {
      // ignore
    }
  }

  return {
    ok: false,
    kind: "validation",
    status: 404,
    errors: { _id: "This validation record could not be found." },
  };
}

export async function deleteRunUnified(
  id: string,
  auth: { session: Session | null; demoUser?: DemoUser | null }
): Promise<ApiResult<{ ok: true }>> {
  const local = getLocalRuns();
  const filtered = local.filter((item) => item.id !== id);
  if (filtered.length !== local.length) {
    setLocalRuns(filtered);
    return { ok: true, data: { ok: true } };
  }

  if (auth.session?.access_token) {
    try {
      const remote = await apiDeleteRun(id, auth.session.access_token);
      if (remote.ok) return remote;
    } catch {
      // fallback
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
