import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileUp,
  ListChecks,
  Shield,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ScopeNotice } from "@/components/ScopeNotice";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";

const FLOW_STEPS = [
  { number: "01", label: "Provide context", detail: "Identify the institution and application type." },
  { number: "02", label: "Compare lists", detail: "Match required names against supplied names." },
  { number: "03", label: "Review evidence", detail: "Inspect missing or expired observations." },
];

const CAPABILITIES = [
  {
    icon: FileSearch,
    accent: "bg-blue-50 text-blue-700",
    title: "Checklist comparison",
    text: "Compare the required-document list you provide with the submitted names returned in the request.",
  },
  {
    icon: CheckCircle2,
    accent: "bg-teal-50 text-teal-700",
    title: "Expiry observations",
    text: "Surface supplied dates that fall before the service evaluation date for independent review.",
  },
  {
    icon: BookOpen,
    accent: "bg-violet-50 text-violet-700",
    title: "Evidence review",
    text: "Keep finding messages, source fields, and timestamps visible in one review record.",
  },
];

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader
        eyebrow="Evidence-first workspace"
        title="Preliminary document checks"
        description="A focused workspace for comparing caller-supplied document lists and reviewing the evidence returned by the validation service."
        actions={
          <Button onClick={() => navigate("/validate")} className="gap-2 px-5">
            Start a preliminary check
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <ScopeNotice />

      <section className="overflow-hidden rounded-2xl bg-navy-900 text-white shadow-sm" aria-labelledby="hero-title">
        <div className="grid gap-8 px-6 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)] lg:px-10">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info" className="border-teal-400/30 bg-teal-400/10 text-teal-200">Draft workflow</Badge>
                <span className="text-xs text-slate-400">No files uploaded or stored</span>
              </div>
              <h2 id="hero-title" className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Turn a supplied checklist into a review-ready evidence record.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Start with the context and lists you already have. The service returns preliminary observations without claiming official compliance, authenticity, or eligibility.
              </p>
            </div>
            <div>
              <Button onClick={() => navigate("/validate")} variant="secondary" className="gap-2 border-white/20 bg-white text-navy-900 hover:bg-slate-100">
                Open validation workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              How the review works
            </div>
            <ol className="mt-6 space-y-5">
              {FLOW_STEPS.map((step) => (
                <li key={step.number} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-teal-300/40 text-xs font-semibold text-teal-200">{step.number}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Workspace capabilities">
        <MetricCard icon={ListChecks} label="Review stages" value="3" detail="Context, comparison, evidence" accent="bg-blue-50 text-blue-700" />
        <MetricCard icon={FileUp} label="File intake" value="0" detail="No upload endpoint is exposed" accent="bg-amber-50 text-amber-700" />
        <MetricCard icon={Shield} label="Available endpoints" value="2" detail="Health and validation" accent="bg-teal-50 text-teal-700" />
      </section>

      <section aria-labelledby="capabilities-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Supported today</p>
            <h2 id="capabilities-title" className="mt-1 text-2xl font-semibold tracking-tight text-navy-900">A focused review surface</h2>
          </div>
          <p className="max-w-md text-sm text-slate-500">Every result is derived from the values supplied in the current request.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, accent, title, text }) => (
            <Card key={title} className="group p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-navy-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              <button onClick={() => navigate("/about")} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
                View scope <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]" aria-label="Workspace activity and boundaries">
        <Card className="p-6 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace activity</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-900">No saved checks yet</h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
            <p className="text-sm font-medium text-navy-900">Activity history is intentionally unavailable.</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">This prototype has no persistent storage. Run a check to review a live response, then use the evidence record to guide human follow-up.</p>
            <Button onClick={() => navigate("/validate")} variant="secondary" className="mt-5 gap-2">
              Begin a check <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <Card className="border-slate-200 bg-slate-100/80 p-6 shadow-none sm:p-7">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-700" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-navy-900">Prototype boundaries</h2>
          </div>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
            <li>No official AICTE ruleset is loaded.</li>
            <li>Document authenticity is not verified.</li>
            <li>No authentication, persistence, upload, or OCR workflow is exposed.</li>
            <li>Results are preliminary observations for human review.</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, accent }: { icon: typeof ListChecks; label: string; value: string; detail: string; accent: string }) {
  return (
    <Card className="flex items-center gap-4 p-5 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight text-navy-900">{value}</p>
          <p className="truncate text-xs text-slate-500">{detail}</p>
        </div>
      </div>
    </Card>
  );
}
