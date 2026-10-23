import { Shield, FileText, Server } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Scope and operating limits"
        title="About this tool"
        description="A transparent view of the checks, contract, and safeguards behind this preliminary document-review prototype."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)] lg:items-start">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-700" />
                <CardTitle>What this tool evaluates</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-4 text-sm leading-6 text-slate-700">
              <p>
                This tool accepts a caller-supplied checklist of required documents and compares it against a submitted list. It identifies:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li><strong>Missing documents</strong> — required names not present in the submitted list.</li>
                <li><strong>Expired documents</strong> — supplied dates that fall before the server&apos;s current UTC date.</li>
              </ul>
            </div>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-teal-700" />
                <CardTitle>API contract</CardTitle>
              </div>
              <CardDescription>Contract version 0.1.0-draft</CardDescription>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Available API endpoints</caption>
                <thead>
                  <tr className="border-b border-slate-200">
                    <th scope="col" className="py-2 pr-4 text-left font-medium text-slate-600">Endpoint</th>
                    <th scope="col" className="py-2 pr-4 text-left font-medium text-slate-600">Method</th>
                    <th scope="col" className="py-2 text-left font-medium text-slate-600">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs">/health</td>
                    <td className="py-3 pr-4"><Badge variant="info">GET</Badge></td>
                    <td className="py-3 text-slate-700">Service health check</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-mono text-xs">/api/v1/validate</td>
                    <td className="py-3 pr-4"><Badge variant="info">POST</Badge></td>
                    <td className="py-3 text-slate-700">Caller-supplied checklist validation</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-lg bg-slate-100 px-4 py-3 text-xs text-slate-700">
              <p><strong>Status values:</strong> <code>preliminary_checks_passed</code> · <code>attention_required</code></p>
              <p className="mt-2"><strong>Finding codes:</strong> <code>MISSING_DOCUMENT</code> · <code>DOCUMENT_EXPIRED</code></p>
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Alert variant="warning" title="What this tool does not do">
            <ul className="mt-1 space-y-2">
              <li>It does not load an official AICTE regulatory checklist.</li>
              <li>It does not verify document authenticity or content.</li>
              <li>It does not establish regulatory compliance or eligibility.</li>
              <li>It does not provide a legally binding approval decision.</li>
              <li>A completed check means only that the supplied lists agree.</li>
            </ul>
          </Alert>

          <Card className="border-slate-200 bg-slate-100/70 p-6 shadow-none">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-700" />
                <CardTitle className="text-sm">Security and production status</CardTitle>
              </div>
            </CardHeader>
            <div className="space-y-3 text-sm leading-6 text-slate-700">
              <p>This tool has no authentication, authorization, tenant isolation, persistent storage, or audit trail. It is not production-ready.</p>
              <p>Use synthetic identifiers only. Do not submit real institutional documents or personal data.</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
