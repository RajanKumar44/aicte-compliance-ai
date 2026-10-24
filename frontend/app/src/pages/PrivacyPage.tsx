import { AlertTriangle, FileLock2 } from "lucide-react";
import { Card, CardContent, CardDescription } from "@/components/Card";

const sections = [
  {
    title: "Information entered",
    body: "A validation request can include an institution identifier, application type, required document names, submitted document names, and optional expiry dates. The values are sent to the validation API to compare the supplied lists and dates.",
  },
  {
    title: "How the prototype handles requests",
    body: "A signed-in user may explicitly opt in to save a validation run. The application stores the supplied request and returned result snapshot, the authenticated user, institution, and timestamps in Supabase Postgres. Records are scheduled for hard deletion after 365 days. Users can delete a record sooner when their role allows it.",
  },
  {
    title: "Files and document contents",
    body: "This interface has no file upload or OCR endpoint. A saved run can contain institution identifiers, document names, and expiry dates as text. Do not save real records until the operator has completed legal, hosting, and privacy review.",
  },
  {
    title: "Access and retention",
    body: "Authentication uses Supabase Auth. Database policies scope access to institution membership: users can access their own records, while institution reviewers and administrators can access records in their institution. The application does not use a Supabase service-role key. The 365-day deletion job does not by itself describe the retention of provider backups or hosting logs.",
  },
  {
    title: "Before public use",
    body: "The operator must confirm the Supabase project region, backup retention, hosting logs, network processors, deletion procedures, a privacy contact, and applicable legal requirements before public use. These policies remain a draft until those details and legal review are complete.",
  },
];

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-muted">Privacy policy draft</p>
        <h1 className="text-3xl font-bold tracking-tight text-text-heading sm:text-4xl">Privacy policy</h1>
        <p className="max-w-3xl text-base leading-relaxed text-text-body">
          This draft describes the current history implementation. It is incomplete and must be reviewed against the hosting setup before public use.
        </p>
      </header>

      <div className="flex items-start gap-3 border border-warning-border bg-warning-bg/30 p-4 text-sm leading-relaxed text-text-body" role="note">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-text" aria-hidden="true" />
        <p><strong className="text-text-heading">Not ready for launch.</strong> Operator identity, contact details, Supabase region and backup retention, hosting-log retention, and legal review still need confirmation.</p>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <FileLock2 className="h-5 w-5 text-accent-strong" aria-hidden="true" />
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
