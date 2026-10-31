// Typed API Client for Regulatory Change Impact Analyzer (Feature 3)

const API_BASE = import.meta.env.VITE_API_URL || "";

export interface RegulatorySource {
  id: string;
  name: string;
  official_url: string;
  publisher: string;
  category: "council_handbook" | "gazette_notification" | "circular" | "court_order" | "state_policy";
  jurisdiction: string;
  source_type: "primary_statutory" | "official_gazette" | "administrative_circular" | "regulatory_board";
  monitoring_status: "active" | "paused" | "archived";
  last_checked_at: string;
  last_retrieved_at: string;
  verification_status: "verified" | "unverified" | "in_review";
}

export interface RegulatoryDocument {
  id: string;
  source_id: string;
  title: string;
  document_number?: string;
  issuing_authority: string;
  document_type: string;
  publication_date: string;
  effective_date: string;
  source_url?: string;
  verification_status: string;
}

export interface RegulatoryVersion {
  id: string;
  document_id: string;
  version_number: string;
  academic_year: string;
  supersedes_version_id?: string | null;
  status: "draft" | "in_review" | "verified_active" | "superseded" | "archived";
  file_sha256?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

export interface RegulatoryClause {
  id: string;
  version_id: string;
  clause_number: string;
  chapter: string;
  section_title: string;
  page_number: number;
  clause_text: string;
  clause_type: string;
  extraction_confidence: number;
  extraction_method: string;
  is_verified: boolean;
}

export interface RegulatoryChange {
  id: string;
  previous_version_id?: string;
  new_version_id: string;
  previous_clause_id?: string;
  new_clause_id?: string;
  change_type: "added" | "modified" | "removed" | "threshold_changed" | "deadline_changed" | "criteria_changed" | "procedural";
  title: string;
  description: string;
  old_text?: string | null;
  new_text?: string | null;
  diff?: string[];
  significance: "critical" | "major" | "minor" | "clarification";
  review_status: "in_review" | "confirmed" | "rejected" | "needs_clarification";
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_comments?: string;
  mapped_requirements?: ComplianceRequirement[];
  created_at: string;
}

export interface ComplianceRequirement {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  mandatory: boolean;
  linked_clause_id?: string;
}

export interface InstitutionalImpact {
  id: string;
  change_id: string;
  institution_id: string;
  requirement_id?: string;
  impact_category:
    | "no_impact"
    | "informational"
    | "evidence_update_required"
    | "requirement_review_required"
    | "potential_compliance_gap"
    | "urgent_review_required"
    | "manual_verification_required";
  impact_severity: "critical" | "high" | "medium" | "low" | "info";
  explanation: string;
  recommended_action: string;
  affected_documents: string[];
  affected_findings: string[];
  affected_corrective_actions: string[];
  review_status: "pending_review" | "acknowledged" | "action_created" | "waived";
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface RegulatoryDashboardData {
  total_sources: number;
  total_documents: number;
  total_versions: number;
  total_changes: number;
  confirmed_changes: number;
  pending_change_reviews: number;
  total_institutional_impacts: number;
  urgent_impacts: number;
  requirements_monitored: number;
  active_academic_year: string;
}

function authHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function fetchRegulatorySources(token?: string | null): Promise<RegulatorySource[]> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/sources`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to fetch regulatory sources");
  return res.json();
}

export async function createRegulatorySource(payload: Partial<RegulatorySource>, token?: string | null): Promise<RegulatorySource> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/sources`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create regulatory source");
  return res.json();
}

export async function fetchRegulatoryDocuments(token?: string | null): Promise<RegulatoryDocument[]> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/documents`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to fetch regulatory documents");
  return res.json();
}

export async function fetchRegulatoryVersions(token?: string | null): Promise<RegulatoryVersion[]> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/versions`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Failed to fetch regulatory versions");
  return res.json();
}

export async function fetchVersionClauses(versionId: string, token?: string | null): Promise<RegulatoryClause[]> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/versions/${versionId}/clauses`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch version clauses");
  return res.json();
}

export async function compareRegulatoryVersions(
  versionId: string,
  baseVersionId?: string,
  token?: string | null
): Promise<{ base_version: string; target_version: string; total_changes: number; changes: any[] }> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/versions/${versionId}/compare`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ target_version_id: versionId, base_version_id: baseVersionId }),
  });
  if (!res.ok) throw new Error("Failed to compare regulatory versions");
  return res.json();
}

export async function fetchRegulatoryChanges(
  filters?: { significance?: string; review_status?: string },
  token?: string | null
): Promise<RegulatoryChange[]> {
  const params = new URLSearchParams();
  if (filters?.significance) params.set("significance", filters.significance);
  if (filters?.review_status) params.set("review_status", filters.review_status);

  const res = await fetch(`${API_BASE}/api/v1/regulatory/changes?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch regulatory changes");
  return res.json();
}

export async function fetchRegulatoryChangeDetail(id: string, token?: string | null): Promise<RegulatoryChange> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/changes/${id}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch change detail");
  return res.json();
}

export async function reviewRegulatoryChange(
  id: string,
  review_status: string,
  comments: string,
  token?: string | null
): Promise<RegulatoryChange> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/changes/${id}/review`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ review_status, comments }),
  });
  if (!res.ok) throw new Error("Failed to review regulatory change");
  return res.json();
}

export async function fetchComplianceRequirements(token?: string | null): Promise<ComplianceRequirement[]> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/requirements`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch compliance requirements");
  return res.json();
}

export async function fetchInstitutionalImpacts(
  filters?: { institution_id?: string; severity?: string; review_status?: string },
  token?: string | null
): Promise<InstitutionalImpact[]> {
  const params = new URLSearchParams();
  if (filters?.institution_id) params.set("institution_id", filters.institution_id);
  if (filters?.severity) params.set("severity", filters.severity);
  if (filters?.review_status) params.set("review_status", filters.review_status);

  const res = await fetch(`${API_BASE}/api/v1/regulatory/impact-assessments?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch institutional impacts");
  return res.json();
}

export async function reviewInstitutionalImpact(
  id: string,
  review_status: "acknowledged" | "action_created" | "waived",
  comments: string,
  token?: string | null
): Promise<InstitutionalImpact> {
  const res = await fetch(`${API_BASE}/api/v1/regulatory/impact-assessments/${id}/review`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ review_status, comments }),
  });
  if (!res.ok) throw new Error("Failed to review institutional impact");
  return res.json();
}

export async function fetchRegulatoryDashboard(
  institutionId?: string,
  token?: string | null
): Promise<RegulatoryDashboardData> {
  const q = institutionId ? `?institution_id=${encodeURIComponent(institutionId)}` : "";
  const res = await fetch(`${API_BASE}/api/v1/regulatory/dashboard${q}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch regulatory dashboard");
  return res.json();
}
