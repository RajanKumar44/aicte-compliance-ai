import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";

const TRACKS = [
  {
    id: "eoa",
    title: "Extension of Approval (EoA)",
    badge: "Routine Annual Renewal",
    description: "Applicable to existing approved engineering, polytechnic, and management institutions.",
    documents: [
      { name: "AICTE Previous Year Approval Letter", purpose: "Validates continuous approved operational status" },
      { name: "Mandatory Disclosure (Web Portal)", purpose: "Public disclosure of faculty, intake, and infrastructure per AICTE norms" },
      { name: "Fire & Life Safety NOC", purpose: "State Fire Department clearance (must be unexpired at scrutiny time)" },
      { name: "Building Occupancy / Completion Certificate", purpose: "Municipal statutory certification of campus built-up area" },
      { name: "Structural Soundness / Stability Certificate", purpose: "Certified structural engineer validation of building safety" },
      { name: "Land Use Certificate (Non-Agricultural)", purpose: "Revenue authority confirmation of institutional educational land use" },
    ],
    commonDeficiency: "Expired fire safety certificates and un-updated mandatory disclosures on the college public website.",
  },
  {
    id: "new_institution",
    title: "New Institution Setup",
    badge: "Initial Establishment",
    description: "Applicable to trusts/societies establishing a new technical university or college campus.",
    documents: [
      { name: "Registered Trust / Society / Section-8 Deed", purpose: "Legal foundation of sponsoring sponsoring body" },
      { name: "Land Ownership Deed / 30-Year Registered Lease", purpose: "Proof of unencumbered, contiguous educational land parcel" },
      { name: "Master Plan & Building Blueprint", purpose: "Architect-certified instructional, administrative and amenity zones" },
      { name: "Fixed Deposit (Corpus Fund) Receipt", purpose: "Joint FD in name of AICTE and Sponsoring Body" },
      { name: "State Pollution Control Board NOC", purpose: "Environmental and sewage treatment clearance" },
      { name: "Affidavit 1 & Affidavit 2 (AICTE Portal Format)", purpose: "Statutory self-disclosure by Chairman and Principal" },
    ],
    commonDeficiency: "Non-contiguous land plots exceeding maximum allowable separation distance, or pending NA conversion.",
  },
  {
    id: "intake_change",
    title: "Intake Variation & New Courses",
    badge: "Expansion & Diversification",
    description: "Applicable to existing institutions seeking seat expansion or new engineering/management branches.",
    documents: [
      { name: "AICTE Current Year Approval", purpose: "Base approval validating current approved seat intake" },
      { name: "NBA Accreditation Certificate", purpose: "Mandatory accreditation for requested branches or overall college" },
      { name: "Faculty Cadre Ratio Affidavit (1:2:6)", purpose: "Professor : Associate Professor : Assistant Professor compliance" },
      { name: "Laboratory Equipment Adequacy Certificate", purpose: "Confirmation of required equipment and software licenses" },
      { name: "Affiliating University NOC", purpose: "State technological university consent for intake variation" },
    ],
    commonDeficiency: "Shortage of senior Ph.D. faculty in Professor and Associate Professor cadres.",
  },
];

const FAQS = [
  {
    q: "What happens if a statutory certificate expires during the AICTE scrutiny window?",
    a: "Under AICTE APH regulations, any expired document (such as a Fire Safety NOC or Provisional Occupancy Certificate) triggers a Deficiency Report. The institution is summoned before a Re-Scrutiny or Standing Hearing Committee (SHC) and must present renewed certificates or an official government renewal acknowledgment.",
  },
  {
    q: "How does the AICTE Self-Disclosure model work for Extension of Approval (EoA)?",
    a: "Under the APH 2024–2027 framework, routine approvals are processed based on the digital self-disclosure submitted by the institution confirming that infrastructure, student-to-faculty ratios, and funds remain compliant. However, AICTE conducts random unannounced physical visits (EVC) to audit the veracity of disclosures.",
  },
  {
    q: "What are the standard Faculty-Student Ratio (FSR) norms for engineering programs?",
    a: "For Undergraduate Engineering & Technology programs, the required FSR is 1:15 or 1:20 depending on the accreditation status and course tier. In addition, institutions must maintain a cadre hierarchy of 1 Professor : 2 Associate Professors : 6 Assistant Professors per department.",
  },
  {
    q: "Can an institution appeal an adverse decision by the Scrutiny Committee?",
    a: "Yes. An institution flagged with deficiencies can appear before the Standing Hearing Committee (SHC) with compliance proofs. If still aggrieved, an appeal can be filed before the Standing Appellate Committee (SAC) whose recommendations are submitted to the Council for final decision.",
  },
];

export function AboutPage() {
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const activeTrack = TRACKS[selectedTrack];

  return (
    <div className="mx-auto max-w-6xl space-y-12 animate-fade-in">
      {/* Header */}
      <section className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-2 px-3.5 py-1 text-xs font-bold text-text-heading">
          <BookOpen className="h-3.5 w-3.5 text-accent-strong" aria-hidden="true" />
          <span>AICTE Regulatory Knowledge Base</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-heading sm:text-4xl">
          Approval Process & Scrutiny Handbook Guide
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-text-body">
          <strong>General guidance content</strong> drawn from material referenced in this
          prototype's source notes (AICTE Approval Process Handbook 2024–2027). It is{' '}
          <strong>not verified current official policy</strong>: no AICTE rule is active in
          this prototype and no content shown here has been certified against the current
          official document version. Always confirm against the official AICTE source
          before acting on it.
        </p>
      </section>

      {/* Main Grid: Interactive Checklist Matrix + Side Panel */}
      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(17rem,0.9fr)]">
        <div className="min-w-0 space-y-8">
          {/* Interactive Document Readiness Matrix */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-accent-strong" aria-hidden="true" />
                    Mandatory Document Repertoire by Approval Track
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Select an approval track to view mandatory regulatory filings and common deficiency pitfalls.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Track selector buttons */}
              <div className="grid gap-2 sm:grid-cols-3">
                {TRACKS.map((track, index) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => setSelectedTrack(index)}
                    className={`rounded-lg border p-3.5 text-left transition-all ${
                      selectedTrack === index
                        ? "border-primary-500 bg-bg-2 shadow-sm border-2 font-bold"
                        : "border-border bg-bg-1 hover:border-border-hover text-text-secondary"
                    }`}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
                      {track.badge}
                    </span>
                    <span className="mt-1 block text-sm font-bold text-text-heading">
                      {track.title}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Track Details */}
              <div className="space-y-5 rounded-xl border border-border bg-bg-1 p-5">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-text-heading">{activeTrack.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{activeTrack.description}</p>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Mandatory Statutory Certificates ({activeTrack.documents.length})
                  </h4>
                  <ul className="divide-y divide-border rounded-lg border border-border bg-bg-0 text-sm">
                    {activeTrack.documents.map((doc) => (
                      <li key={doc.name} className="flex flex-col gap-1 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-text" aria-hidden="true" />
                          <div>
                            <p className="font-semibold text-text-heading text-xs sm:text-sm">{doc.name}</p>
                            <p className="text-xs text-text-secondary">{doc.purpose}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-warning-border bg-warning-bg/30 p-4 text-xs leading-relaxed text-text-body">
                  <div className="flex items-center gap-2 font-semibold text-warning-text mb-1">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Common Scrutiny Committee Deficiency:</span>
                  </div>
                  <p>{activeTrack.commonDeficiency}</p>
                </div>

                <div className="pt-2">
                  <Link to="/validate">
                    <Button size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Test This Track in Validation Workspace
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AICTE Scrutiny FAQs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary-400" aria-hidden="true" />
                Frequently Asked Regulatory Questions
              </CardTitle>
              <CardDescription>
                Procedural guidelines for college principals, directors, and compliance officers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FAQS.map((faq, i) => {
                const isOpen = expandedFaq === i;
                return (
                  <div key={faq.q} className="rounded-lg border border-border bg-bg-1 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : i)}
                      className="flex w-full items-center justify-between p-4 text-left font-semibold text-text-heading text-sm hover:bg-bg-2 transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-border p-4 text-xs sm:text-sm leading-relaxed text-text-body bg-bg-0">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Cards */}
        <aside className="space-y-6" aria-label="Regulatory guidelines and resources">
          <Card className="border-warning-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-warning-text" aria-hidden="true" />
                Scrutiny Boundaries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-xs leading-relaxed text-text-secondary">
                <li className="flex gap-2.5">
                  <XCircle className="h-4 w-4 text-error-text shrink-0 mt-0.5" />
                  <span>This tool evaluates checklist completeness and supplied expiry dates.</span>
                </li>
                <li className="flex gap-2.5">
                  <XCircle className="h-4 w-4 text-error-text shrink-0 mt-0.5" />
                  <span>It does not physically authenticate stamps or land registration seals.</span>
                </li>
                <li className="flex gap-2.5">
                  <XCircle className="h-4 w-4 text-error-text shrink-0 mt-0.5" />
                  <span>Does not submit documents directly to the AICTE web-portal.</span>
                </li>
                <li className="flex gap-2.5">
                  <XCircle className="h-4 w-4 text-error-text shrink-0 mt-0.5" />
                  <span>Official approval is granted solely by AICTE after formal committee review.</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5 text-primary-400" aria-hidden="true" />
                Institutional Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-text-secondary">
              <p>
                <strong>Zero File Retention:</strong> We evaluate document names and dates only. Original certificate files or confidential financial records are never saved or uploaded.
              </p>
              <p>
                <strong>Attributable History:</strong> Saved records are associated with verified institutional reviewer or administrator accounts, ensuring clean audit logs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ExternalLink className="h-5 w-5 text-text-muted" aria-hidden="true" />
                Official AICTE Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <a
                href="https://www.aicte-india.org/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-text-secondary hover:text-text-heading font-medium transition-colors p-2 rounded bg-bg-2 hover:bg-bg-3"
              >
                <span>AICTE Official Portal</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://documents.aicte-india.org/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-text-secondary hover:text-text-heading font-medium transition-colors p-2 rounded bg-bg-2 hover:bg-bg-3"
              >
                <span>AICTE Document Portal</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://www.nbaind.org/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between text-text-secondary hover:text-text-heading font-medium transition-colors p-2 rounded bg-bg-2 hover:bg-bg-3"
              >
                <span>NBA Accreditation Portal</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
