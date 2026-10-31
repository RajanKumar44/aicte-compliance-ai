import { useState, useEffect } from "react";
import {
  CheckSquare,
  Clock,
  UserCheck,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  X,
  History,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import {
  fetchActions,
  createAction,
  transitionAction,
  fetchActionEvidence,
  submitActionEvidence,
  reviewActionDecision,
  revalidateActionOutcome,
  fetchActionDashboard,
  type ActionItem,
  type ActionPriority,
  type ActionStatus,
  type ActionDashboardData,
  type EvidenceItem,
} from "@/lib/action-planner-api";

export function ActionPlannerPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [dashboard, setDashboard] = useState<ActionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Create Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newFindingCode, setNewFindingCode] = useState("DOC_EXPIRED");
  const [newFindingTitle, setNewFindingTitle] = useState("Fire Safety Certificate Expired");
  const [newPriority, setNewPriority] = useState<ActionPriority>("critical");
  const [newDept, setNewDept] = useState("Estate & Civil Works");
  const [newAssignee, setNewAssignee] = useState("civil-lead@institution.edu");
  const [newDueDate, setNewDueDate] = useState("2026-11-30");
  const [newOutcome, setNewOutcome] = useState("Valid statutory renewal challan or certified NOC");
  const [newCriteria, setNewCriteria] = useState("Official State Fire Officer seal & validity confirmation");
  const [newEvidenceReq, setNewEvidenceReq] = useState("Certified PDF renewal receipt or certificate");

  // Detail Drawer
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "evidence" | "review" | "history">("details");

  // Evidence Form
  const [evTitle, setEvTitle] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evCategory, setEvCategory] = useState<any>("statutory_clearance");

  // Review Form
  const [reviewComments, setReviewComments] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [actList, dashData] = await Promise.all([
        fetchActions(),
        fetchActionDashboard(),
      ]);
      setActions(actList);
      setDashboard(dashData);
    } catch (e) {
      console.error("Failed to load actions", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenDetail = async (action: ActionItem) => {
    setSelectedAction(action);
    setActiveTab("details");
    try {
      const evs = await fetchActionEvidence(action.id);
      setEvidenceList(evs);
    } catch {
      setEvidenceList([]);
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAction({
        institution_id: "INST-ACTIVE",
        finding_code: newFindingCode,
        finding_title: newFindingTitle,
        finding_description: `${newFindingTitle} requires immediate institutional remediation.`,
        finding_severity: newPriority === "critical" ? "critical" : "severe",
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        responsible_department: newDept,
        assigned_to: newAssignee,
        due_date: newDueDate,
        expected_outcome: newOutcome,
        acceptance_criteria: newCriteria,
        required_evidence: newEvidenceReq,
      });
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create action");
    }
  };

  const handleTransition = async (target: ActionStatus, reason: string) => {
    if (!selectedAction) return;
    try {
      const updated = await transitionAction(selectedAction.id, target, reason);
      setSelectedAction(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || "Transition failed");
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;
    try {
      await submitActionEvidence(selectedAction.id, {
        title: evTitle,
        description: evDesc,
        category: evCategory,
      });
      setEvTitle("");
      setEvDesc("");
      const evs = await fetchActionEvidence(selectedAction.id);
      setEvidenceList(evs);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to submit evidence");
    }
  };

  const handleReview = async (decision: "approved" | "changes_requested" | "rejected") => {
    if (!selectedAction) return;
    try {
      await reviewActionDecision(selectedAction.id, {
        decision,
        comments: reviewComments || `Evidence ${decision} by Institutional Scrutiny Reviewer`,
      });
      setReviewComments("");
      const evs = await fetchActionEvidence(selectedAction.id);
      setEvidenceList(evs);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record review");
    }
  };

  const handleRevalidate = async () => {
    if (!selectedAction) return;
    try {
      await revalidateActionOutcome(selectedAction.id, {
        evidence_summary: "Automated AICTE verification engine evaluated uploaded statutory evidence",
      });
      loadData();
      alert("Revalidation successful! Action has been evaluated and marked Resolved.");
    } catch (err: any) {
      alert(err.message || "Revalidation failed");
    }
  };

  const filteredActions = actions.filter((a) => {
    const matchSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.finding_code.toLowerCase().includes(search.toLowerCase()) ||
      a.responsible_department.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchPriority = priorityFilter === "all" || a.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-2 px-3 py-1 text-xs font-bold text-text-heading">
            <CheckSquare className="h-3.5 w-3.5 text-accent-strong" />
            <span>AICTE Pre-Scrutiny Corrective Actions</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-heading sm:text-4xl">
            Compliance Action Planner
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl">
            Convert compliance findings into assigned, trackable, reviewable, and verifiable institutional corrective actions.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 bg-accent-strong text-white hover:bg-accent-hover self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Corrective Action</span>
        </Button>
      </section>

      {/* KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-muted uppercase">Total Actions</p>
              <p className="text-2xl font-extrabold text-text-heading mt-1">{dashboard?.total_actions ?? actions.length}</p>
            </div>
            <CheckSquare className="h-7 w-7 text-text-muted opacity-40" />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-muted uppercase">Open Tasks</p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">{dashboard?.open_actions ?? 0}</p>
            </div>
            <Clock className="h-7 w-7 text-amber-500 opacity-40" />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-muted uppercase">In Progress</p>
              <p className="text-2xl font-extrabold text-blue-600 mt-1">{dashboard?.in_progress_actions ?? 0}</p>
            </div>
            <RefreshCw className="h-7 w-7 text-blue-500 opacity-40" />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-muted uppercase">Awaiting Review</p>
              <p className="text-2xl font-extrabold text-purple-600 mt-1">{dashboard?.awaiting_review_actions ?? 0}</p>
            </div>
            <UserCheck className="h-7 w-7 text-purple-500 opacity-40" />
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-muted uppercase">Resolved</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{dashboard?.resolved_actions ?? 0}</p>
            </div>
            <CheckCircle2 className="h-7 w-7 text-emerald-500 opacity-40" />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search action title, finding code, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-bg-1 pl-9 pr-4 py-2 text-sm text-text-heading focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Filter className="h-3.5 w-3.5" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-border bg-bg-1 px-2.5 py-1.5 text-xs text-text-heading"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="assigned">Assigned</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted_for_review">Submitted for Review</option>
                <option value="approved">Approved</option>
                <option value="resolved">Resolved</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-md border border-border bg-bg-1 px-2.5 py-1.5 text-xs text-text-heading"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Items List */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-bg-1 py-3 px-5">
          <CardTitle className="text-sm font-bold text-text-heading flex items-center justify-between">
            <span>Corrective Action Ledger ({filteredActions.length})</span>
            <span className="text-xs font-normal text-text-muted">Click row to open details & evidence</span>
          </CardTitle>
        </CardHeader>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-sm text-text-muted">Loading corrective actions...</div>
          ) : filteredActions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CheckSquare className="mx-auto h-10 w-10 text-text-muted opacity-40" />
              <p className="text-sm font-medium text-text-heading">No corrective actions match your filters</p>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Create a corrective action to assign responsibility and upload verified statutory evidence.
              </p>
            </div>
          ) : (
            filteredActions.map((action) => (
              <div
                key={action.id}
                onClick={() => handleOpenDetail(action)}
                className="p-4 hover:bg-bg-2 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-bold bg-bg-2 border border-border text-text-heading">
                      {action.finding_code}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        action.priority === "critical"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : action.priority === "high"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {action.priority}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        action.status === "resolved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : action.status === "submitted_for_review"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : action.status === "in_progress"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-gray-50 text-gray-700 border border-gray-200"
                      }`}
                    >
                      {action.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-text-heading">{action.title}</h3>
                  <p className="text-xs text-text-secondary line-clamp-1">{action.description}</p>
                </div>

                <div className="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-center gap-1 text-xs text-text-muted">
                  <span className="font-medium text-text-heading">{action.responsible_department}</span>
                  <span>Due: {action.due_date}</span>
                  <div className="inline-flex items-center gap-1 text-[11px] text-accent-strong font-bold">
                    <span>Manage</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Detail / Action Drawer */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl h-full bg-bg-1 border-l border-border shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border bg-bg-2 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-bg-1 border border-border rounded">
                    {selectedAction.finding_code}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    {selectedAction.responsible_department}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-text-heading">{selectedAction.title}</h2>
              </div>
              <button
                onClick={() => setSelectedAction(null)}
                className="rounded p-1 hover:bg-bg-1 text-text-muted hover:text-text-heading"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-border bg-bg-1 px-5">
              {(["details", "evidence", "review", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 text-xs font-bold capitalize border-b-2 transition-all ${
                    activeTab === tab
                      ? "border-accent-strong text-accent-strong"
                      : "border-transparent text-text-muted hover:text-text-heading"
                  }`}
                >
                  {tab === "evidence" ? `Evidence (${evidenceList.length})` : tab}
                </button>
              ))}
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === "details" && (
                <div className="space-y-5 text-sm">
                  <div className="p-4 rounded-lg bg-bg-2 border border-border space-y-2">
                    <p className="text-xs font-bold uppercase text-text-muted">Underlying Compliance Finding</p>
                    <p className="font-bold text-text-heading">{selectedAction.finding_title}</p>
                    <p className="text-xs text-text-secondary">{selectedAction.finding_description}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-text-muted">Description & Implementation Plan</label>
                    <p className="text-text-body leading-relaxed">{selectedAction.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-text-muted block">Assignee</span>
                      <span className="font-medium text-text-heading">{selectedAction.assigned_to || "Unassigned"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Due Date</span>
                      <span className="font-medium text-text-heading">{selectedAction.due_date}</span>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Expected Outcome</span>
                      <span className="font-medium text-text-heading">{selectedAction.expected_outcome}</span>
                    </div>
                    <div>
                      <span className="text-xs text-text-muted block">Acceptance Criteria</span>
                      <span className="font-medium text-text-heading">{selectedAction.acceptance_criteria}</span>
                    </div>
                  </div>

                  {/* Status Action Transitions */}
                  <div className="p-4 rounded-lg border border-border bg-bg-2 space-y-3">
                    <p className="text-xs font-bold uppercase text-text-heading">Lifecycle Transition Gate</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedAction.status === "assigned" && (
                        <Button
                          size="sm"
                          onClick={() => handleTransition("accepted", "Assigned member accepted the task")}
                        >
                          Accept Action
                        </Button>
                      )}
                      {(selectedAction.status === "accepted" || selectedAction.status === "changes_requested") && (
                        <Button
                          size="sm"
                          onClick={() => handleTransition("in_progress", "Started remediation work")}
                        >
                          Start Work (In Progress)
                        </Button>
                      )}
                      {selectedAction.status === "in_progress" && (
                        <Button
                          size="sm"
                          onClick={() => handleTransition("submitted_for_review", "Remediation evidence prepared")}
                        >
                          Submit for Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "evidence" && (
                <div className="space-y-6">
                  {/* Evidence Submission Form */}
                  <form onSubmit={handleSubmitEvidence} className="p-4 rounded-lg border border-border bg-bg-2 space-y-3">
                    <p className="text-xs font-bold uppercase text-text-heading flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-accent-strong" />
                      <span>Submit Corrective Evidence Document</span>
                    </p>
                    <div>
                      <input
                        type="text"
                        placeholder="Evidence Title (e.g. Municipal Fire Renewal Challan)"
                        value={evTitle}
                        onChange={(e) => setEvTitle(e.target.value)}
                        required
                        className="w-full text-xs rounded border border-border bg-bg-1 p-2 text-text-heading"
                      />
                    </div>
                    <div>
                      <textarea
                        placeholder="Evidence description & clause provenance..."
                        value={evDesc}
                        onChange={(e) => setEvDesc(e.target.value)}
                        required
                        rows={2}
                        className="w-full text-xs rounded border border-border bg-bg-1 p-2 text-text-heading"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <select
                        value={evCategory}
                        onChange={(e) => setEvCategory(e.target.value)}
                        className="text-xs rounded border border-border bg-bg-1 p-1.5 text-text-heading"
                      >
                        <option value="statutory_clearance">Statutory Clearance NOC</option>
                        <option value="affidavit">Notarized Affidavit</option>
                        <option value="infrastructure">Infrastructure Evidence</option>
                        <option value="faculty_record">Faculty Ph.D. Record</option>
                        <option value="financial">Financial Corpus FDR</option>
                      </select>
                      <Button size="sm" type="submit" className="bg-accent-strong text-white hover:bg-accent-hover">
                        Upload Evidence
                      </Button>
                    </div>
                  </form>

                  {/* Evidence Items */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase text-text-muted">Submitted Evidence Files ({evidenceList.length})</p>
                    {evidenceList.length === 0 ? (
                      <p className="text-xs text-text-secondary italic">No evidence uploaded yet.</p>
                    ) : (
                      evidenceList.map((ev) => (
                        <div key={ev.id} className="p-3 rounded border border-border bg-bg-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-text-heading">{ev.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-bg-2 border border-border uppercase">
                              {ev.status}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary">{ev.description}</p>
                          {ev.reviewer_comments && (
                            <p className="text-xs text-purple-700 bg-purple-50 p-1.5 rounded mt-1">
                              <strong>Reviewer:</strong> {ev.reviewer_comments}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === "review" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-lg border border-border bg-bg-2 space-y-3">
                    <p className="text-xs font-bold uppercase text-text-heading flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-accent-strong" />
                      <span>Reviewer Scrutiny Decision</span>
                    </p>
                    <textarea
                      placeholder="Enter verification rationale and findings..."
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      rows={3}
                      className="w-full text-xs rounded border border-border bg-bg-1 p-2 text-text-heading"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReview("approved")}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Approve Evidence
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReview("changes_requested")}
                        className="bg-amber-600 text-white hover:bg-amber-700"
                      >
                        Request Changes
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleReview("rejected")}
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        Reject Submission
                      </Button>
                    </div>
                  </div>

                  {/* Revalidation Gate */}
                  {selectedAction.status === "approved" && (
                    <div className="p-4 rounded-lg border border-emerald-300 bg-emerald-50 space-y-3">
                      <p className="text-xs font-bold uppercase text-emerald-800">Deterministic Revalidation Gate</p>
                      <p className="text-xs text-emerald-700">
                        Evidence has been approved. Execute compliance revalidation against AICTE rules to formally close and resolve this action.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleRevalidate}
                        className="bg-emerald-700 text-white hover:bg-emerald-800"
                      >
                        Execute AICTE Revalidation
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase text-text-muted flex items-center gap-1.5">
                    <History className="h-4 w-4" />
                    <span>Audit Trail & Lifecycle History</span>
                  </p>
                  <div className="space-y-2 border-l-2 border-border pl-4">
                    {selectedAction.history?.map((h) => (
                      <div key={h.id} className="relative pb-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-heading capitalize">
                            {h.to_status.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] text-text-muted">{new Date(h.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-text-secondary">{h.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-xl bg-bg-1 border border-border shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border bg-bg-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-heading">Initiate Corrective Action Plan</h2>
              <button onClick={() => setCreateOpen(false)} className="rounded p-1 hover:bg-bg-1 text-text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAction} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-muted uppercase">Compliance Finding Code</label>
                  <select
                    value={newFindingCode}
                    onChange={(e) => {
                      setNewFindingCode(e.target.value);
                      if (e.target.value === "DOC_EXPIRED") setNewFindingTitle("Fire Safety Certificate Expired");
                      else if (e.target.value === "FSR_CADRE_DEFICIT") setNewFindingTitle("Professor Cadre Shortfall");
                      else setNewFindingTitle("Mandatory Building Occupancy NOC Missing");
                    }}
                    className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading font-mono"
                  >
                    <option value="DOC_EXPIRED">DOC_EXPIRED (Fire/Safety NOC)</option>
                    <option value="FSR_CADRE_DEFICIT">FSR_CADRE_DEFICIT (1:2:6 Ratio)</option>
                    <option value="DOC_MISSING">DOC_MISSING (Occupancy Certificate)</option>
                    <option value="LAND_DEFICIT">LAND_DEFICIT (Contiguous Title)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-text-muted uppercase">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as ActionPriority)}
                    className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-text-muted uppercase">Action Plan Title</label>
                <input
                  type="text"
                  placeholder="e.g. Renew State Fire NOC & Upload DFO Challan"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted uppercase">Remediation Steps & Plan</label>
                <textarea
                  placeholder="Detail the exact institutional steps required..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  required
                  rows={3}
                  className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-text-muted uppercase">Department</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    required
                    className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading"
                  />
                </div>
                <div>
                  <label className="font-bold text-text-muted uppercase">Assignee Email</label>
                  <input
                    type="text"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    required
                    className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading"
                  />
                </div>
                <div>
                  <label className="font-bold text-text-muted uppercase">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    required
                    className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-text-muted uppercase">Expected Outcome</label>
                <input
                  type="text"
                  placeholder="e.g. Valid statutory renewal challan or certified NOC"
                  value={newOutcome}
                  onChange={(e) => setNewOutcome(e.target.value)}
                  className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted uppercase">Acceptance Criteria</label>
                <input
                  type="text"
                  placeholder="e.g. Official State Fire Officer seal & validity confirmation"
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading"
                />
              </div>

              <div>
                <label className="font-bold text-text-muted uppercase">Required Evidence</label>
                <input
                  type="text"
                  placeholder="e.g. Certified PDF renewal receipt or certificate"
                  value={newEvidenceReq}
                  onChange={(e) => setNewEvidenceReq(e.target.value)}
                  className="w-full mt-1 p-2 rounded border border-border bg-bg-1 text-text-heading"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-accent-strong text-white hover:bg-accent-hover">
                  Initiate Corrective Action
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default ActionPlannerPage;
