import { AlertTriangle, FileText } from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/Card";

const sections = [
  {
    title: "What the tool does",
    body: "The prototype compares document names supplied as required with names supplied as submitted. It also flags supplied expiry dates earlier than the validation service's current UTC date.",
  },
  {
    title: "No regulatory determination",
    body: "A passed result means only that the supplied lists agree and no supplied expiry date is past. The tool does not load an authoritative AICTE checklist, determine eligibility, verify authenticity, or replace qualified human review.",
  },
  {
    title: "Prototype use",
    body: "Use synthetic sample data only. The current application has no accounts, saved application history, file upload, or OCR endpoint. Do not treat the prototype as a production service.",
  },
  {
    title: "Terms required before launch",
    body: "The service operator, contact details, governing jurisdiction, permitted-use rules, service commitments, and legally reviewed terms have not been supplied. This page is a content draft, not a complete agreement.",
  },
];

export function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-300">Launch document draft</p>
        <h1 className="text-3xl font-bold tracking-tight text-text-heading sm:text-4xl">Terms and conditions</h1>
        <p className="max-w-3xl text-base leading-relaxed text-text-body">
          This page records the prototype's current limits. It is not a complete set of terms for public or production use.
        </p>
      </header>

      <div className="flex items-start gap-3 border border-warning-border bg-warning-bg/30 p-4 text-sm leading-relaxed text-text-body" role="note">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-text" aria-hidden="true" />
        <p><strong className="text-text-heading">Not ready for launch.</strong> The operator and jurisdiction details, permitted-use terms, and legal review are still required.</p>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <FileText className="h-5 w-5 text-primary-300" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-text-heading">Prototype terms draft</h2>
              <CardDescription>Current function and limits, stated without a compliance guarantee</CardDescription>
            </div>
          </div>
          <div className="space-y-6">
            {sections.map((section, index) => (
              <section key={section.title} className={index ? "border-t border-border pt-5" : undefined}>
                <h2 className="text-base font-semibold text-text-heading">{section.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-body">{section.body}</p>
              </section>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
