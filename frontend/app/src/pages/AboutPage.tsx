import { AlertTriangle, FileCheck2, LockKeyhole, Server, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";

const BOUNDARIES = [
  "No official AICTE regulatory ruleset is loaded.",
  "Document authenticity and content are not verified.",
  "No authentication, tenant isolation, or audit trail exists.",
  "No persistence, upload, OCR, or saved-report workflow exists.",
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader
        eyebrow="Scope and operating limits"
        title="Transparent by design"
        description="Understand exactly what this preliminary review surface evaluates, what the API returns, and which safeguards are still required before production use."
        actions={<Badge variant="warning">Prototype · not production-ready</Badge>}
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <Card className="border-navy-800 bg-navy-900 p-6 text-white shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-200">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Evidence-first contract</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">A review record, not an approval certificate.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">The service compares caller-supplied document names and dates, then returns evidence-linked observations for a human reviewer to verify.</p>
            </div>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <MiniFact label="Input" value="Caller-supplied lists" />
            <MiniFact label="Output" value="Findings + evidence" />
            <MiniFact label="Decision" value="Human review" />
          </div>
        </Card>
        <Alert variant="warning" title="Use synthetic data only" className="h-full">
          Do not submit real institutional documents, personal data, or confidential records. This prototype does not upload, store, authenticate, or persist documents.
        </Alert>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-teal-700" aria-hidden="true" /><CardTitle>What is evaluated</CardTitle></div>
              <CardDescription>Only values supplied in the current validation request.</CardDescription>
            </CardHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile title="Missing documents" text="Required names that are not present in the submitted list." tone="red" />
              <InfoTile title="Expired observations" text="Supplied dates that fall before the service evaluation date." tone="amber" />
              <InfoTile title="Evidence fields" text="Finding messages, source values, and timestamps returned by the API." tone="teal" />
              <InfoTile title="Neutral status" text="A passing result only means the supplied lists agree for this request." tone="slate" />
            </div>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2"><Server className="h-4 w-4 text-teal-700" aria-hidden="true" /><CardTitle>API contract</CardTitle></div>
              <CardDescription>Version 0.1.0-draft · two available HTTP endpoints</CardDescription>
            </CardHeader>
            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
              <EndpointRow method="GET" path="/health" purpose="Service health check" />
              <EndpointRow method="POST" path="/api/v1/validate" purpose="Caller-supplied checklist validation" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <CodeFact label="Status values" value="preliminary_checks_passed · attention_required" />
              <CodeFact label="Finding codes" value="MISSING_DOCUMENT · DOCUMENT_EXPIRED" />
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-slate-700" aria-hidden="true" /><CardTitle>Production safeguards still needed</CardTitle></div>
              <CardDescription>These controls are outside the current prototype.</CardDescription>
            </CardHeader>
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              {BOUNDARIES.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" /><span>{item}</span></li>)}
            </ul>
          </Card>
          <Card className="border-slate-200 bg-slate-100/80 p-6 shadow-none">
            <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" /><div><h2 className="text-sm font-semibold text-navy-900">Why human review remains required</h2><p className="mt-2 text-sm leading-6 text-slate-700">The service has no authoritative ruleset, document content inspection, authenticity verification, or legal decision authority. Treat every result as a structured observation to investigate.</p></div></div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-white">{value}</p></div>;
}

function InfoTile({ title, text, tone }: { title: string; text: string; tone: "red" | "amber" | "teal" | "slate" }) {
  const styles = { red: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700", teal: "bg-teal-50 text-teal-700", slate: "bg-slate-100 text-slate-700" };
  return <div className="rounded-xl border border-slate-200 p-4"><div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${styles[tone]}`}><span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" /></div><h3 className="text-sm font-semibold text-navy-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>;
}

function EndpointRow({ method, path, purpose }: { method: string; path: string; purpose: string }) {
  return <div className="grid gap-2 px-4 py-3 sm:grid-cols-[5rem_13rem_minmax(0,1fr)] sm:items-center"><Badge variant="info" className="w-fit">{method}</Badge><code className="text-xs text-navy-900">{path}</code><span className="text-sm text-slate-600">{purpose}</span></div>;
}

function CodeFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-100 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p><code className="mt-1 block break-words text-xs leading-5 text-slate-700">{value}</code></div>;
}
