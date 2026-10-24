import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileSearch,
  ListChecks,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/Card";
import { ScopeNotice } from "@/components/ScopeNotice";

const capabilities = [
  {
    icon: FileSearch,
    color: "text-primary-300 bg-primary-900/30",
    title: "List comparison",
    description: "Compares the required document names with the names supplied as submitted.",
  },
  {
    icon: CalendarDays,
    color: "text-warning-text bg-warning-bg/40",
    title: "Expiry date checks",
    description: "Flags supplied dates earlier than the server's current UTC date.",
  },
  {
    icon: BookOpen,
    color: "text-info-text bg-info-bg/50",
    title: "Reviewable findings",
    description: "Shows the list or date evidence behind each preliminary finding.",
  },
];

const workflow = [
  { number: "01", title: "Enter request details", description: "Use a synthetic institution identifier and choose an application type." },
  { number: "02", title: "Supply document names", description: "Enter the required list, the submitted list, and any expiry dates." },
  { number: "03", title: "Review the response", description: "Check each finding and decide what needs human follow-up." },
];

const limits = [
  "The service does not load an authoritative AICTE checklist.",
  "No document upload or OCR route is available.",
  "The app does not create accounts or save application history.",
  "Use synthetic sample data. Results need human review.",
];

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 animate-fade-in">
      <section className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]" aria-labelledby="dashboard-title">
        <div className="min-w-0 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-300">
            AICTE application document review
          </p>
          <h1 id="dashboard-title" className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-text-heading sm:text-4xl">
            Check the document lists supplied with a request
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-text-body sm:text-lg">
            Enter required and submitted document names, then review missing items and supplied expiry dates.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/validate"
              className="app-button app-button-primary group inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
            >
              Open validation form
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to="/about" className="text-sm font-medium text-text-body underline decoration-border-hover underline-offset-4 transition-colors hover:text-text-heading">
              Read how checks work
            </Link>
          </div>
          <div className="flex items-start gap-3 border-l-2 border-primary-500 pl-4 pt-1 text-sm text-text-secondary">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" aria-hidden="true" />
            <p>Preliminary checks only. This tool does not determine AICTE compliance or verify document authenticity.</p>
          </div>
        </div>

        <Card className="min-w-0 border-border bg-bg-1">
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary-700 bg-primary-950 text-primary-200">
                <ListChecks className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-text-heading">Request flow</h2>
                <CardDescription>Three steps from input to review</CardDescription>
              </div>
            </div>
            <ol className="space-y-5">
              {workflow.map((step, index) => (
                <li key={step.number} className="relative flex gap-3">
                  {index < workflow.length - 1 && <span className="absolute bottom-[-1.25rem] left-[0.9375rem] top-8 w-px bg-border" aria-hidden="true" />}
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-bg-2 font-mono text-xs font-semibold text-text-body">
                    {step.number}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-sm font-semibold text-text-heading">{step.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section aria-label="Prototype scope notice">
        <ScopeNotice />
      </section>

      <section className="space-y-6" aria-labelledby="capabilities-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">What the endpoint checks</p>
            <h2 id="capabilities-heading" className="mt-1 text-xl font-semibold text-text-heading">Request-based comparisons</h2>
          </div>
          <p className="max-w-lg text-sm leading-relaxed text-text-secondary">The result reflects only the lists and dates provided in that request.</p>
        </div>
        <div className="grid items-stretch gap-5 md:grid-cols-3">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="h-full transition-colors duration-200 hover:border-border-hover">
                <CardContent className="space-y-5">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-md", item.color)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription className="text-text-body">{item.description}</CardDescription>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-8" aria-labelledby="scope-heading">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-warning-text" aria-hidden="true" />
          <h2 id="scope-heading" className="text-lg font-semibold text-text-heading">Prototype limits</h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {limits.map((item) => (
            <li key={item} className="border-l border-warning-border pl-3 text-sm leading-relaxed text-text-body">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
