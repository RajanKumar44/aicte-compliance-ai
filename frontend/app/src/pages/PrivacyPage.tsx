import { AlertTriangle, FileLock2 } from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/Card";

const sections = [
  {
    title: "Information entered",
    body: "A validation request can include an institution identifier, application type, required document names, submitted document names, and optional expiry dates. The values are sent to the validation API to compare the supplied lists and dates.",
  },
  {
    title: "How the prototype handles requests",
    body: "The current API contract states that the service does not save applications or maintain user accounts. The application has no saved validation history. The service returns the comparison result to the requesting page.",
  },
  {
    title: "Files and document contents",
    body: "This interface has no file upload or OCR endpoint. It accepts document names and optional dates as text. Do not enter real institutional or personal information in this prototype.",
  },
  {
    title: "Before public use",
    body: "The operator must confirm hosting logs, network processors, retention, deletion procedures, a privacy contact, and any applicable legal requirements. Those infrastructure details are not established by this prototype's API contract.",
  },
];

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-300">Privacy policy draft</p>
        <h1 className="text-3xl font-bold tracking-tight text-text-heading sm:text-4xl">Privacy policy</h1>
        <p className="max-w-3xl text-base leading-relaxed text-text-body">
          This draft describes the current prototype. It is incomplete and must be reviewed against the hosting setup before public use.
        </p>
      </header>

      <div className="flex items-start gap-3 border border-warning-border bg-warning-bg/30 p-4 text-sm leading-relaxed text-text-body" role="note">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-text" aria-hidden="true" />
        <p><strong className="text-text-heading">Not ready for launch.</strong> Operator identity, contact details, infrastructure retention, and legal review still need confirmation.</p>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <FileLock2 className="h-5 w-5 text-primary-300" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-text-heading">Current prototype</h2>
              <CardDescription>What is sent and what the application does with it</CardDescription>
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
