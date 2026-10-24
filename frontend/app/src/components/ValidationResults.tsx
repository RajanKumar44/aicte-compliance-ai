import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock,
  FileCheck2,
  FileX2,
  Gauge,
  Info,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "./Card";
import { Badge } from "./Badge";
import { Alert } from "./Alert";
import { FindingsTable } from "./FindingsTable";
import { ScopeNotice } from "./ScopeNotice";
import { Button } from "./Button";
import { PageHeader } from "./PageHeader";
import { formatTimestamp, humanizeApplicationType, humanizeDocName } from "@/lib/utils";
import type { ValidationRequest, ValidationResponse } from "@/lib/api";

interface ValidationResultsProps {
  data: ValidationResponse;
  request?: ValidationRequest | null;
  onReset: () => void;
}

export function ValidationResults({ data, request, onReset }: ValidationResultsProps) {
  const isPassed = data.status === "preliminary_checks_passed";
  const missingCount = data.missing_documents.length;
  const expiredCount = data.expired_documents.length;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const missing = new Set(data.missing_documents);
  const expired = new Set(data.expired_documents);
  const requiredDocs = request?.required_documents ?? unique([...data.missing_documents, ...data.expired_documents]);
  const submittedDocs = request?.submitted_documents ?? [];
  const matchedCount = requiredDocs.filter((doc) => !missing.has(doc)).length;
  const coverage = requiredDocs.length > 0 ? Math.round((matchedCount / requiredDocs.length) * 100) : 0;
  const submittedExtras = submittedDocs.filter((doc) => !requiredDocs.includes(doc));

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader
        eyebrow="Evidence review record"
        title={isPassed ? "Preliminary check complete" : "Review observations before follow-up"}
        description={isPassed
          ? "The supplied lists agree for this request. Use the record as a starting point for human review, not as an approval decision."
          : "The validation service returned observations from the supplied lists and dates. Review each item against the authoritative source record."}
        actions={<Button onClick={onReset} variant="secondary">Run another check</Button>}
      />

      <ScopeNotice />

      <Card className="overflow-hidden p-0 shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-200 px-5 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-7">
          <div className="flex items-start gap-4">
            <div className={isPassed
              ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"
              : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"}>
              {isPassed ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-navy-900 outline-none">
                {isPassed ? "Lists agree for this request" : "Attention required for review"}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                {isPassed
                  ? "The required names supplied in this request were found in the submitted list. This does not confirm regulatory compliance, authenticity, or AICTE approval."
                  : `${missingCount + expiredCount} observation${missingCount + expiredCount === 1 ? "" : "s"} require review before any decision is made.`}
              </p>
            </div>
          </div>
          <Badge variant={isPassed ? "info" : "warning"} className="self-start">
            {isPassed ? <><CheckCircle2 className="h-3 w-3" /> Preliminary result</> : <><AlertTriangle className="h-3 w-3" /> Attention required</>}
          </Badge>
        </div>
        <div className="grid gap-4 bg-slate-50/70 px-5 py-5 text-sm sm:grid-cols-2 lg:grid-cols-5 sm:px-7">
          <Meta label="Institution" value={data.institution_id} />
          <Meta label="Application" value={humanizeApplicationType(data.application_type)} />
          <Meta label="Scope" value={data.validation_scope.replace(/_/g, " ")} icon={<Gauge className="h-3.5 w-3.5" />} />
          <Meta label="Checked" value={formatTimestamp(data.checked_at)} icon={<CalendarDays className="h-3.5 w-3.5" />} />
          <Meta label="Source" value={data.source.replace(/_/g, " ")} icon={<Info className="h-3.5 w-3.5" />} />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <CoverageCard coverage={coverage} matched={matchedCount} total={requiredDocs.length} />
        <SummaryCard icon={FileX2} label="Missing documents" value={missingCount} tone="red" detail="Required names not in the submitted list" />
        <SummaryCard icon={Clock} label="Expired observations" value={expiredCount} tone="amber" detail="Supplied dates before evaluation date" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)] lg:items-start">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Document comparison</CardTitle>
              <CardDescription>Names are compared exactly after input normalization. Statuses describe this request only.</CardDescription>
            </CardHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <ComparisonColumn title="Required checklist" icon={<FileCheck2 className="h-4 w-4" />}>
                {requiredDocs.length === 0 ? <EmptyComparison text="No required names were returned." /> : requiredDocs.map((doc) => {
                  const isMissing = missing.has(doc);
                  const isExpired = expired.has(doc);
                  return <ComparisonItem key={doc} label={humanizeDocName(doc)} status={isMissing ? "Missing" : isExpired ? "Expired" : "Included"} tone={isMissing ? "error" : isExpired ? "warning" : "info"} />;
                })}
              </ComparisonColumn>
              <ComparisonColumn title="Submitted list" icon={<FileCheck2 className="h-4 w-4" />}>
                {submittedDocs.length === 0 ? <EmptyComparison text="No submitted names were supplied." /> : submittedDocs.map((doc) => {
                  const isRequired = requiredDocs.includes(doc);
                  const isExpired = expired.has(doc);
                  return <ComparisonItem key={doc} label={humanizeDocName(doc)} status={isExpired ? "Expired" : isRequired ? "Matched" : "Additional"} tone={isExpired ? "warning" : isRequired ? "info" : "neutral"} />;
                })}
                {submittedExtras.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-500">Additional names are shown for context; they are not treated as findings.</p>}
              </ComparisonColumn>
            </div>
          </Card>

          {data.findings.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Evidence findings</CardTitle>
                <CardDescription>These observations come from the supplied inputs, not an independent compliance determination.</CardDescription>
              </CardHeader>
              <FindingsTable findings={data.findings} />
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Alert variant="warning" title="Important notice">{data.notice}</Alert>
          <Card className="p-6 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2"><CircleAlert className="h-4 w-4 text-teal-700" /><CardTitle>Review next</CardTitle></div>
              <CardDescription>Use this record to guide human follow-up.</CardDescription>
            </CardHeader>
            <ol className="space-y-4 text-sm leading-6 text-slate-700">
              <li className="flex gap-3"><span className="font-semibold text-teal-700">01</span><span>Confirm this is the correct source checklist for the process.</span></li>
              <li className="flex gap-3"><span className="font-semibold text-teal-700">02</span><span>Recheck every missing or expired item against source records.</span></li>
              <li className="flex gap-3"><span className="font-semibold text-teal-700">03</span><span>Record the human decision outside this prototype.</span></li>
            </ol>
            <div className="mt-6 border-t border-slate-200 pt-5"><Button variant="primary" onClick={onReset} className="w-full">Run another check</Button></div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Meta({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-1 flex items-center gap-1 truncate text-sm font-medium text-navy-900">{icon}{value}</p></div>;
}

function CoverageCard({ coverage, matched, total }: { coverage: number; matched: number; total: number }) {
  return <Card className="flex items-center gap-4 p-5 shadow-sm"><div className="relative h-16 w-16 shrink-0" role="img" aria-label={`Checklist coverage ${coverage} percent`}><svg viewBox="0 0 104 104" className="h-full w-full -rotate-90"><circle cx="52" cy="52" r="42" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-200" pathLength="100" /><circle cx="52" cy="52" r="42" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" className="text-teal-600" pathLength="100" strokeDasharray={`${coverage} ${100 - coverage}`} /></svg><span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-navy-900">{coverage}%</span></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Checklist coverage</p><p className="mt-1 text-sm font-semibold text-navy-900">{matched} of {total} required names</p><p className="mt-1 text-xs leading-5 text-slate-500">Derived from this request, not a compliance score.</p></div></Card>;
}

function SummaryCard({ icon: Icon, label, value, detail, tone }: { icon: typeof FileX2; label: string; value: number; detail: string; tone: "red" | "amber" }) {
  const toneClasses = tone === "red" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <Card className="flex items-center gap-4 p-5 shadow-sm"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}><Icon className="h-5 w-5" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p><div className="mt-1 flex items-baseline gap-2"><p className="text-2xl font-semibold tracking-tight text-navy-900">{value}</p><p className="text-xs text-slate-500">{detail}</p></div></div></Card>;
}

function ComparisonColumn({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-sm font-semibold text-navy-900">{icon}{title}</div><div className="mt-3 space-y-2">{children}</div></div>;
}

function ComparisonItem({ label, status, tone }: { label: string; status: string; tone: "info" | "error" | "warning" | "neutral" }) {
  return <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"><span className="min-w-0 break-words text-sm text-navy-900">{label}</span><Badge variant={tone}>{status}</Badge></div>;
}

function EmptyComparison({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">{text}</div>;
}

function unique(values: string[]) {
  return [...new Set(values)];
}
