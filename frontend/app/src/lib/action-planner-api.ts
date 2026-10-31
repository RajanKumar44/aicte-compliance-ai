// Typed API Client for Compliance Action Planner (Feature 2)

const API_BASE = import.meta.env.VITE_API_URL || "";

export type ActionPriority = "critical" | "high" | "medium" | "low";
export type ActionStatus =
  | "draft"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "submitted_for_review"
  | "changes_requested"
  | "approved"
  | "revalidation_required"
  | "resolved"
  | "cancelled";

export type FindingSeverity = "critical" | "severe" | "moderate" | "advisory";
export type EvidenceCategory =
  | "statutory_clearance"
  | "affidavit"
  | "infrastructure"
  | "faculty_record"
  | "financial"
  | "undertaking"
  | "other";

export interface StatusHistoryItem {
  id: string;
  action_id: string;
  from_status: string;
  to_status: string;
  actor_id: string;
  reason: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  institution_id: string;
  validation_run_id: string | null;
  finding_code: string;
  finding_title: string;
  finding_description: string;
  finding_severity: FindingSeverity;
  title: string;
  description: string;
  priority: ActionPriority;
  status: ActionStatus;
  responsible_department: string;
  assigned_to: string | null;
  reviewer_id: string | null;
  start_date: string | null;
  due_date: string;
  expected_outcome: string;
  acceptance_criteria: string;
  required_evidence: string;
  internal_notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
  history?: StatusHistoryItem[];
}

export interface ActionCreatePayload {
  institution_id: string;
  validation_run_id?: string;
  finding_code: string;
  finding_title: string;
  finding_description: string;
  finding_severity: FindingSeverity;
  title: string;
  description: string;
  priority: ActionPriority;
  responsible_department: string;
  assigned_to?: string;
  reviewer_id?: string;
  start_date?: string;
  due_date: string;
  expected_outcome: string;
  acceptance_criteria: string;
  required_evidence: string;
  internal_notes?: string;
}

export interface ActionDashboardData {
  total_actions: number;
  open_actions: number;
  overdue_actions: number;
  due_soon_actions: number;
  in_progress_actions: number;
  awaiting_review_actions: number;
  resolved_actions: number;
  by_priority: Record<string, number>;
  by_status: Record<string, number>;
  by_department: Record<string, number>;
}

export interface EvidenceItem {
  id: string;
  action_id: string;
  document_id?: string;
  title: string;
  description: string;
  category: EvidenceCategory;
  storage_path?: string;
  submitted_by: string;
  submission_date: string;
  status: "pending_review" | "approved" | "changes_requested" | "rejected";
  reviewer_comments?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface ReviewDecisionPayload {
  decision: "approved" | "changes_requested" | "rejected";
  comments: string;
}

export interface RevalidationPayload {
  evidence_summary: string;
  new_run_id?: string;
  notes?: string;
}

function authHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchActions(
  filters?: {
    institution_id?: string;
    status?: ActionStatus;
    priority?: ActionPriority;
    department?: string;
  },
  token?: string | null
): Promise<ActionItem[]> {
  const params = new URLSearchParams();
  if (filters?.institution_id) params.set("institution_id", filters.institution_id);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.department) params.set("department", filters.department);

  const res = await fetch(`${API_BASE}/api/v1/actions?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch corrective actions");
  return res.json();
}

export async function fetchActionDetail(id: string, token?: string | null): Promise<ActionItem> {
  const res = await fetch(`${API_BASE}/api/v1/actions/${id}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch action details");
  return res.json();
}

export async function createAction(
  payload: ActionCreatePayload,
  token?: string | null
): Promise<ActionItem> {
  const res = await fetch(`${API_BASE}/api/v1/actions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create action" }));
    throw new Error(err.detail || "Failed to create action");
  }
  return res.json();
}

export async function updateAction(
  id: string,
  payload: Partial<ActionCreatePayload>,
  token?: string | null
): Promise<ActionItem> {
  const res = await fetch(`${API_BASE}/api/v1/actions/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update action");
  return res.json();
}

export async function assignAction(
  id: string,
  assigned_to: string,
  reviewer_id?: string,
  reason?: string,
  token?: string | null
): Promise<ActionItem> {
  const res = await fetch(`${API_BASE}/api/v1/actions/${id}/assign`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ assigned_to, reviewer_id, reason: reason || "Assigned via portal" }),
  });
  if (!res.ok) throw new Error("Failed to assign action");
  return res.json();
}

export async function transitionAction(
  id: string,
  target_status: ActionStatus,
  reason: string,
  token?: string | null
): Promise<ActionItem> {
  const res = await fetch(`${API_BASE}/api/v1/actions/${id}/transition`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ target_status, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Invalid transition" }));
    throw new Error(err.detail || "Invalid transition");
  }
  return res.json();
}

export async function fetchActionEvidence(id: string, token?: string | null): Promise<EvidenceItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/actions/${id}/evidence`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch evidence");
  return res.json();
}

export async function submitActionEvidence(
  id: string,
  evidence: { title: string; description: string; category: EvidenceCategory; document_id?: string },
  token?: string | null
): Promise<EvidenceItem> {
  const res = await fetch(`${API_BASE}/api/v1/actions/${id}/evidence`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(evidence),
  });
  if (!res.ok) throw new Error("Failed to submit evidence");
  return res.json();
}

export async function reviewActionDecision(
  id: string,
  payload: ReviewDecisionPayload,
  token?: string | null
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/actions/${id}/reviews`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to record review");
  return res.json();
}

export async function revalidateActionOutcome(
  id: string,
  payload: RevalidationPayload,
  token?: string | null
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/actions/${id}/revalidate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to revalidate action" }));
    throw new Error(err.detail || "Failed to revalidate action");
  }
  return res.json();
}

export async function fetchActionDashboard(
  institutionId?: string,
  token?: string | null
): Promise<ActionDashboardData> {
  const q = institutionId ? `?institution_id=${encodeURIComponent(institutionId)}` : "";
  const res = await fetch(`${API_BASE}/api/v1/actions/dashboard${q}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch action dashboard metrics");
  return res.json();
}
