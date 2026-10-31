import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scale,
  BookOpen,
  GitCompare,
  CheckCircle2,
  ExternalLink,
  Search,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import {
  fetchRegulatorySources,
  fetchRegulatoryDocuments,
  fetchRegulatoryVersions,
  fetchVersionClauses,
  fetchRegulatoryChanges,
  reviewRegulatoryChange,
  fetchComplianceRequirements,
  fetchInstitutionalImpacts,
  reviewInstitutionalImpact,
  fetchRegulatoryDashboard,
  type RegulatorySource,
  type RegulatoryDocument,
  type RegulatoryVersion,
  type RegulatoryClause,
  type RegulatoryChange,
  type ComplianceRequirement,
  type InstitutionalImpact,
  type RegulatoryDashboardData,
} from "@/lib/regulatory-api";
import { createAction } from "@/lib/action-planner-api";

export function RegulatoryImpactPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "sources" | "diff" | "impacts" | "requirements">("overview");
  const [dashboard, setDashboard] = useState<RegulatoryDashboardData | null>(null);
  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [documents, setDocuments] = useState<RegulatoryDocument[]>([]);
  const [versions, setVersions] = useState<RegulatoryVersion[]>([]);
  const [changes, setChanges] = useState<RegulatoryChange[]>([]);
  const [impacts, setImpacts] = useState<InstitutionalImpact[]>([]);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [significanceFilter, setSignificanceFilter] = useState("all");
  const [impactSeverityFilter, setImpactSeverityFilter] = useState("all");

  // Selected Clause Explorer
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [clauses, setClauses] = useState<RegulatoryClause[]>([]);
  const [clausesLoading, setClausesLoading] = useState(false);
  const [clauseSearch, setClauseSearch] = useState("");

  // Selected Change for Review
  const [selectedChange, setSelectedChange] = useState<RegulatoryChange | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [dash, src, doc, ver, chg, imp, req] = await Promise.all([
        fetchRegulatoryDashboard(),
        fetchRegulatorySources(),
        fetchRegulatoryDocuments(),
        fetchRegulatoryVersions(),
        fetchRegulatoryChanges(),
        fetchInstitutionalImpacts(),
        fetchComplianceRequirements(),
      ]);
      setDashboard(dash);
      setSources(src);
      setDocuments(doc);
      setVersions(ver);
      setChanges(chg);
      setImpacts(imp);
      setRequirements(req);
      if (ver.length > 0 && !selectedVersionId) {
        setSelectedVersionId(ver[0].id);
      }
    } catch (e) {
      console.error("Failed to load regulatory data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedVersionId) return;
    const loadClauses = async () => {
      try {
        setClausesLoading(true);
        const cl = await fetchVersionClauses(selectedVersionId);
        setClauses(cl);
      } catch (err) {
        console.error("Failed to fetch clauses", err);
      } finally {
        setClausesLoading(false);
      }
    };
    loadClauses();
  }, [selectedVersionId]);

  const handleReviewChange = async (status: string) => {
    if (!selectedChange) return;
    try {
      setReviewing(true);
      await reviewRegulatoryChange(selectedChange.id, status, reviewComments);
      setReviewComments("");
      setSelectedChange(null);
      await loadData();
    } catch (err) {
      console.error("Error submitting review", err);
    } finally {
      setReviewing(false);
    }
  };

  const handleCreateActionFromImpact = async (impact: InstitutionalImpact) => {
    try {
      const created = await createAction({
        institution_id: impact.institution_id || "inst-default-001",
        finding_code: "REG_IMPACT_" + impact.impact_severity.toUpperCase(),
        finding_title: `Regulatory Amendment: ${impact.explanation.substring(0, 60)}...`,
        finding_description: impact.explanation,
        finding_severity: impact.impact_severity === "critical" ? "critical" : "severe",
        title: `Remediate Regulatory Impact: ${impact.recommended_action.substring(0, 50)}`,
        description: `${impact.explanation}\n\nRecommended Remediating Action: ${impact.recommended_action}`,
        priority: impact.impact_severity === "critical" ? "critical" : impact.impact_severity === "high" ? "high" : "medium",
        responsible_department: "Regulatory Compliance Cell",
        assigned_to: "compliance-officer@institution.edu",
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        expected_outcome: `Align institutional compliance with amended AICTE norm (${impact.recommended_action})`,
        acceptance_criteria: "Updated statutory evidence verified against current APH criteria.",
        required_evidence: impact.affected_documents.join(", ") || "Institutional compliance self-declaration",
      });

      await reviewInstitutionalImpact(impact.id, "action_created", `Generated Corrective Action ACT-${created.id.substring(0, 8)}`);
      setActionSuccessMsg(`Corrective Action ACT-${created.id.substring(0, 8)} created successfully! Redirecting...`);
      setTimeout(() => {
        navigate("/action-planner");
      }, 1500);
    } catch (err) {
      console.error("Failed to create action from impact", err);
    }
  };

  const filteredChanges = changes.filter((c) => {
    if (significanceFilter !== "all" && c.significance !== significanceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.old_text && c.old_text.toLowerCase().includes(q)) ||
        (c.new_text && c.new_text.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredImpacts = impacts.filter((i) => {
    if (impactSeverityFilter !== "all" && i.impact_severity !== impactSeverityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.explanation.toLowerCase().includes(q) ||
        i.recommended_action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredClauses = clauses.filter((cl) => {
    if (!clauseSearch) return true;
    const q = clauseSearch.toLowerCase();
    return (
      cl.clause_number.toLowerCase().includes(q) ||
      cl.section_title.toLowerCase().includes(q) ||
      cl.clause_text.toLowerCase().includes(q)
    );
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-danger-500/10 text-danger-500 border border-danger-500/20">Critical</span>;
      case "high":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-warning-500/10 text-warning-500 border border-warning-500/20">High</span>;
      case "medium":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Medium</span>;
      case "low":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-primary-500/10 text-primary-500 border border-primary-500/20">Low</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-bg-2 text-text-muted border border-border">Info</span>;
    }
  };

  const getChangeTypeBadge = (t: string) => {
    switch (t) {
      case "threshold_changed":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-warning-500/15 text-warning-500">Threshold Changed</span>;
      case "criteria_changed":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-danger-500/15 text-danger-500">Criteria Changed</span>;
      case "added":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-success-500/15 text-success-500">New Requirement</span>;
      case "modified":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-primary-500/15 text-primary-500">Text Modified</span>;
      case "removed":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-bg-2 text-text-muted">Repealed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-bg-2 text-text-secondary">{t}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-500">
            <Scale className="h-4 w-4" />
            <span>AICTE Regulatory Intelligence • APH 2024–27 Multi-Year Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-text-heading mt-1">Regulatory Change Impact Analyzer</h1>
          <p className="text-sm text-text-secondary max-w-3xl mt-1">
            Detect norm modifications across Approval Process Handbooks, inspect deterministic clause diffs,
            and assess institutional compliance gap impacts before statutory scrutiny.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Handbooks</span>
          </Button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 rounded-lg bg-success-500/10 border border-success-500/20 text-success-500 font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card className="bg-bg-1 border-border">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-text-muted">Monitored Sources</div>
            <div className="text-2xl font-bold text-text-heading mt-1">{dashboard?.total_sources ?? 0}</div>
            <div className="text-[11px] text-text-muted mt-1">Official Councils</div>
          </CardContent>
        </Card>
        <Card className="bg-bg-1 border-border">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-text-muted">Active Cycle</div>
            <div className="text-2xl font-bold text-primary-400 mt-1">{dashboard?.active_academic_year ?? "2024-27"}</div>
            <div className="text-[11px] text-text-muted mt-1">Multi-Year APH</div>
          </CardContent>
        </Card>
        <Card className="bg-bg-1 border-border">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-text-muted">Detected Changes</div>
            <div className="text-2xl font-bold text-text-heading mt-1">{dashboard?.total_changes ?? 0}</div>
            <div className="text-[11px] text-accent-strong mt-1">{dashboard?.confirmed_changes ?? 0} confirmed</div>
          </CardContent>
        </Card>
        <Card className="bg-bg-1 border-border">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-text-muted">Pending Reviews</div>
            <div className="text-2xl font-bold text-warning-500 mt-1">{dashboard?.pending_change_reviews ?? 0}</div>
            <div className="text-[11px] text-text-muted mt-1">Expert scrutiny needed</div>
          </CardContent>
        </Card>
        <Card className="bg-bg-1 border-border">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-text-muted">Institutional Impacts</div>
            <div className="text-2xl font-bold text-text-heading mt-1">{dashboard?.total_institutional_impacts ?? 0}</div>
            <div className="text-[11px] text-text-muted mt-1">Identified gaps</div>
          </CardContent>
        </Card>
        <Card className="bg-bg-1 border-border">
          <CardContent className="p-4">
            <div className="text-xs font-medium text-text-muted">Urgent Actions</div>
            <div className="text-2xl font-bold text-danger-500 mt-1">{dashboard?.urgent_impacts ?? 0}</div>
            <div className="text-[11px] text-danger-500/80 mt-1">Mandatory remediation</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border flex items-center gap-1 sm:gap-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`py-2.5 px-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === "overview"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          Intelligence Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("diff")}
          className={`py-2.5 px-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === "diff"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          Clause Diff & Amendments ({changes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("impacts")}
          className={`py-2.5 px-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === "impacts"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          Institutional Impact Assessments ({impacts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sources")}
          className={`py-2.5 px-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === "sources"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          Sources & Versions ({documents.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requirements")}
          className={`py-2.5 px-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === "requirements"
              ? "border-primary-500 text-primary-400"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          Clause Mappings ({requirements.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Critical Regulatory Amendments (AICTE APH 2024–27)</span>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("diff")} className="text-xs gap-1">
                    <span>Inspect all diffs</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {changes.slice(0, 3).map((chg) => (
                  <div
                    key={chg.id}
                    className="p-4 rounded-lg border border-border bg-bg-1 hover:border-primary-500/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedChange(chg);
                      setActiveTab("diff");
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(chg.significance)}
                        {getChangeTypeBadge(chg.change_type)}
                      </div>
                      <span className="text-xs text-text-muted">{new Date(chg.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="font-semibold text-text-heading text-sm mt-2">{chg.title}</div>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{chg.description}</p>
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-xs text-text-muted">
                      <span>Status: <strong className="text-text-secondary capitalize">{chg.review_status}</strong></span>
                      <span className="text-primary-400 font-medium">Click to compare clause diff →</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Urgent Institutional Compliance Action Required</span>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("impacts")} className="text-xs gap-1">
                    <span>View all impacts</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {impacts.filter(i => i.impact_severity === "critical" || i.impact_severity === "high").map((imp) => (
                  <div key={imp.id} className="p-4 rounded-lg border border-danger-500/20 bg-danger-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(imp.impact_severity)}
                        <span className="text-xs font-mono font-bold text-danger-500">{imp.impact_category.replace(/_/g, " ").toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-text-muted capitalize">{imp.review_status.replace(/_/g, " ")}</span>
                    </div>
                    <div className="text-sm font-semibold text-text-heading">{imp.explanation}</div>
                    <div className="text-xs text-text-secondary bg-bg-0 p-2.5 rounded border border-border">
                      <strong className="text-text-heading">Prescribed Remediation:</strong> {imp.recommended_action}
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-text-muted">Affected: {imp.affected_documents.join(", ") || "General Scrutiny"}</span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleCreateActionFromImpact(imp)}
                        className="gap-1.5 text-xs py-1 h-8"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Create Corrective Action</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Statutory Regulatory Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sources.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg border border-border bg-bg-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary-400 capitalize">{s.publisher}</span>
                      <span className="text-[10px] uppercase font-bold text-success-500 bg-success-500/10 px-1.5 py-0.5 rounded">
                        {s.monitoring_status}
                      </span>
                    </div>
                    <div className="font-semibold text-text-heading text-sm">{s.name}</div>
                    <div className="text-xs text-text-muted truncate">{s.official_url}</div>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-text-muted border-t border-border/40">
                      <span>Jurisdiction: {s.jurisdiction}</span>
                      <a
                        href={s.official_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-400 hover:underline flex items-center gap-1"
                      >
                        Official Portal <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-bg-1 border-border">
              <CardHeader>
                <CardTitle className="text-base font-bold">Statutory Verification Principle</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-text-secondary space-y-2">
                <p>
                  Per AICTE Act 1987 Section 10 and the Approval Process Handbook multi-year mandate,
                  regulatory clause diffs require statutory cross-verification before automatic institutional
                  sanctions or compliance penalties are finalized.
                </p>
                <p>
                  Institutions are granted statutory transition windows for newly amended land and building
                  ratios and teacher cadre revisions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CLAUSE DIFF & AMENDMENTS */}
      {activeTab === "diff" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search clause text, title or diff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="app-control w-full pl-9 pr-3 py-1.5 text-xs bg-bg-1 border border-border rounded-md text-text-heading"
                />
              </div>
              <select
                value={significanceFilter}
                onChange={(e) => setSignificanceFilter(e.target.value)}
                className="app-control py-1.5 px-2 text-xs bg-bg-1 border border-border rounded-md text-text-heading"
              >
                <option value="all">All Significance</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </div>

            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredChanges.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-lg text-text-muted text-sm">
                  No regulatory changes match your filter criteria.
                </div>
              ) : (
                filteredChanges.map((chg) => (
                  <div
                    key={chg.id}
                    onClick={() => setSelectedChange(chg)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedChange?.id === chg.id
                        ? "border-primary-500 bg-primary-500/5 shadow-sm"
                        : "border-border bg-bg-1 hover:border-border-strong"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {getSeverityBadge(chg.significance)}
                        {getChangeTypeBadge(chg.change_type)}
                      </div>
                      <span className="text-[11px] font-bold text-text-muted uppercase">{chg.review_status}</span>
                    </div>
                    <div className="text-sm font-bold text-text-heading mt-2">{chg.title}</div>
                    <p className="text-xs text-text-secondary mt-1 line-clamp-2">{chg.description}</p>
                    <div className="mt-2 text-[11px] text-text-muted flex items-center justify-between pt-2 border-t border-border/40">
                      <span>APH 2024–27</span>
                      <span className="text-primary-400 font-medium">View Diff Inspection →</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            {selectedChange ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityBadge(selectedChange.significance)}
                      {getChangeTypeBadge(selectedChange.change_type)}
                    </div>
                    <div className="text-xs text-text-muted font-mono">ID: {selectedChange.id.substring(0, 8)}</div>
                  </div>
                  <CardTitle className="text-lg font-bold text-text-heading mt-2">{selectedChange.title}</CardTitle>
                  <p className="text-xs text-text-secondary mt-1">{selectedChange.description}</p>
                </CardHeader>

                <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto">
                  {/* Side-by-side or Unified Diff View */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                      <GitCompare className="h-4 w-4 text-primary-400" />
                      <span>Regulatory Clause Difference</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg border border-border bg-danger-500/5">
                        <div className="text-xs font-bold text-danger-500 mb-1 flex items-center gap-1">
                          <span>Previous Statutory Provision (APH 2023-24)</span>
                        </div>
                        <div className="text-xs text-text-secondary font-mono whitespace-pre-wrap bg-bg-0 p-2.5 rounded border border-border min-h-[140px]">
                          {selectedChange.old_text || "<No prior statutory provision or newly introduced clause>"}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-border bg-success-500/5">
                        <div className="text-xs font-bold text-success-500 mb-1 flex items-center gap-1">
                          <span>Current Statutory Provision (APH 2024–27)</span>
                        </div>
                        <div className="text-xs text-text-secondary font-mono whitespace-pre-wrap bg-bg-0 p-2.5 rounded border border-border min-h-[140px]">
                          {selectedChange.new_text || "<Provision repealed or omitted in current APH>"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diff Line Breakdown */}
                  {selectedChange.diff && selectedChange.diff.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Computed Text Diff Lines</div>
                      <div className="font-mono text-xs p-3 rounded-lg bg-bg-0 border border-border space-y-1">
                        {selectedChange.diff.map((line, idx) => (
                          <div
                            key={idx}
                            className={`${
                              line.startsWith("+")
                                ? "text-success-500 bg-success-500/10 px-1 rounded"
                                : line.startsWith("-")
                                ? "text-danger-500 bg-danger-500/10 px-1 rounded"
                                : "text-text-muted"
                            }`}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review / Scrutiny Section */}
                  <div className="p-4 rounded-lg border border-border bg-bg-1 space-y-3 mt-4">
                    <div className="text-xs font-bold text-text-heading uppercase tracking-wider">
                      Regulatory Scrutiny & Expert Confirmation
                    </div>
                    <div className="text-xs text-text-secondary">
                      Current Review Status: <strong className="text-text-heading uppercase">{selectedChange.review_status}</strong>
                    </div>

                    <textarea
                      placeholder="Add compliance officer comments, statutory references, or justification notes..."
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      className="w-full text-xs p-2.5 rounded border border-border bg-bg-0 text-text-heading min-h-[70px]"
                    />

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleReviewChange("confirmed")}
                        disabled={reviewing}
                        className="text-xs gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Confirm Regulatory Amendment</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReviewChange("needs_clarification")}
                        disabled={reviewing}
                        className="text-xs"
                      >
                        Seek Council Clarification
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReviewChange("rejected")}
                        disabled={reviewing}
                        className="text-xs text-danger-500 hover:bg-danger-500/10"
                      >
                        Flag False Positive / Discard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 border border-dashed border-border rounded-lg text-center text-text-muted">
                <GitCompare className="h-12 w-12 text-text-muted/40 mb-3" />
                <h3 className="text-sm font-bold text-text-heading">Select a Regulatory Change</h3>
                <p className="text-xs text-text-secondary max-w-sm mt-1">
                  Choose any detected change from the ledger on the left to inspect detailed clause comparisons,
                  side-by-side diffs, and submit expert confirmation.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INSTITUTIONAL IMPACT ASSESSMENTS */}
      {activeTab === "impacts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search institutional impacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="app-control w-full pl-9 pr-3 py-1.5 text-xs bg-bg-1 border border-border rounded-md text-text-heading"
                />
              </div>
              <select
                value={impactSeverityFilter}
                onChange={(e) => setImpactSeverityFilter(e.target.value)}
                className="app-control py-1.5 px-2 text-xs bg-bg-1 border border-border rounded-md text-text-heading"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredImpacts.length === 0 ? (
              <div className="col-span-2 p-12 text-center border border-dashed border-border rounded-lg text-text-muted">
                No institutional impacts recorded for the current filter.
              </div>
            ) : (
              filteredImpacts.map((imp) => (
                <Card key={imp.id} className="border-border hover:border-primary-500/50 transition-colors flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(imp.impact_severity)}
                        <span className="text-xs font-bold text-text-muted uppercase">
                          {imp.impact_category.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-text-muted">
                        Status: <strong className="text-text-secondary capitalize">{imp.review_status.replace(/_/g, " ")}</strong>
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold text-text-heading mt-2">{imp.explanation}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2 space-y-3">
                    <div className="p-3 rounded-md bg-bg-0 border border-border text-xs space-y-1">
                      <div className="font-bold text-text-heading">Prescribed Institutional Remediation:</div>
                      <div className="text-text-secondary">{imp.recommended_action}</div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-text-muted pt-2 border-t border-border/50 gap-2">
                      <div>
                        Affected: <strong className="text-text-secondary">{imp.affected_documents.join(", ") || "General Scrutiny"}</strong>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleCreateActionFromImpact(imp)}
                        className="gap-1.5 text-xs py-1 h-8"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Create Corrective Action</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SOURCES & VERSIONS */}
      {activeTab === "sources" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-sm font-bold text-text-heading flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary-400" />
              <span>Approval Process Handbooks</span>
            </h3>

            <div className="space-y-3">
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  onClick={() => setSelectedVersionId(ver.id)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedVersionId === ver.id
                      ? "border-primary-500 bg-primary-500/5 shadow-sm"
                      : "border-border bg-bg-1 hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-primary-400">v{ver.version_number}</span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-success-500/10 text-success-500">
                      {ver.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-text-heading mt-1">Academic Year {ver.academic_year}</div>
                  <div className="text-xs text-text-muted mt-1 font-mono truncate">
                    SHA256: {ver.file_sha256 ? ver.file_sha256.substring(0, 16) + "..." : "Official Council PDF"}
                  </div>
                  <div className="mt-2 text-[11px] text-text-muted flex items-center justify-between pt-2 border-t border-border/40">
                    <span>Verified: {ver.verified_by || "AICTE Official"}</span>
                    <span className="text-primary-400 font-semibold">Inspect Clauses →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-text-heading flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary-400" />
                  <span>Structured Clause Explorer</span>
                </h3>
                <span className="text-xs text-text-muted">
                  Extracted statutory provisions from current regulatory handbook ({clauses.length} clauses)
                </span>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search clause by number or title..."
                  value={clauseSearch}
                  onChange={(e) => setClauseSearch(e.target.value)}
                  className="app-control w-full pl-8 pr-3 py-1 text-xs bg-bg-1 border border-border rounded-md text-text-heading"
                />
              </div>
            </div>

            {clausesLoading ? (
              <div className="p-12 text-center text-text-muted text-sm flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary-400" />
                <span>Loading statutory clauses...</span>
              </div>
            ) : filteredClauses.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg text-text-muted text-sm">
                No clauses found for the selected version or search term.
              </div>
            ) : (
              <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                {filteredClauses.map((clause) => (
                  <div key={clause.id} className="p-4 rounded-lg border border-border bg-bg-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded">
                          Clause {clause.clause_number}
                        </span>
                        <span className="text-xs font-semibold text-text-heading">{clause.section_title}</span>
                      </div>
                      <span className="text-[11px] text-text-muted">Page {clause.page_number} • {clause.chapter}</span>
                    </div>
                    <div className="p-3 rounded bg-bg-0 border border-border text-xs text-text-secondary font-mono leading-relaxed">
                      {clause.clause_text}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                      <span>Type: <strong className="text-text-secondary capitalize">{clause.clause_type}</strong></span>
                      <span className="text-success-500 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Statutory Certified
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: REQUIREMENTS & CLAUSE MAPPING */}
      {activeTab === "requirements" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-text-heading">AICTE Compliance Requirements & Clause Traceability</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Bidirectional mapping linking institutional scrutiny rules with statutory Approval Process Handbook clauses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requirements.map((req) => (
              <Card key={req.id} className="border-border flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-primary-400">{req.code}</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      req.mandatory ? "bg-danger-500/10 text-danger-500" : "bg-bg-2 text-text-muted"
                    }`}>
                      {req.mandatory ? "Mandatory" : "Advisory"}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-text-heading mt-1">{req.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 space-y-2">
                  <p className="text-xs text-text-secondary">{req.description}</p>
                  <div className="pt-2 border-t border-border/50 text-[11px] text-text-muted flex items-center justify-between">
                    <span>Category: <strong className="text-text-secondary capitalize">{req.category}</strong></span>
                    <span className="text-primary-400 font-medium">Mapped to APH</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
