import { Shield, FileText, Server } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Alert } from "@/components/Alert";
import { Badge } from "@/components/Badge";

export function AboutPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-navy-900">About This Tool</h1>
        <p className="text-base text-slate-500">
          Technical details, limitations, and scope of the AICTE Compliance AI
          document validation tool.
        </p>
      </div>

      {/* What it does */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600" />
            <CardTitle>What This Tool Does</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
          <p>
            This tool accepts a caller-supplied checklist of required documents and
            compares it against a list of submitted documents. It identifies:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Missing documents</strong> — required documents not present in the
              submitted list.
            </li>
            <li>
              <strong>Expired documents</strong> — documents with a supplied expiry date
              that falls before the server&apos;s current UTC date.
            </li>
          </ul>
        </div>
      </Card>

      {/* What it does NOT do */}
      <Alert variant="warning" title="What This Tool Does NOT Do">
        <ul className="space-y-1.5 mt-1">
          <li>• It does <strong>not</strong> load an official AICTE regulatory checklist.</li>
          <li>• It does <strong>not</strong> verify document authenticity or content.</li>
          <li>• It does <strong>not</strong> establish regulatory compliance or eligibility.</li>
          <li>• It does <strong>not</strong> provide legally binding approval decisions.</li>
          <li>• A &ldquo;Checks Passed&rdquo; result means only that the supplied lists agree.</li>
        </ul>
      </Alert>

      {/* API Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-teal-600" />
            <CardTitle>API Contract</CardTitle>
          </div>
          <CardDescription>
            Contract version 0.1.0-draft
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-4 text-left font-medium text-slate-500">Endpoint</th>
                <th className="py-2 pr-4 text-left font-medium text-slate-500">Method</th>
                <th className="py-2 text-left font-medium text-slate-500">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">/health</td>
                <td className="py-2 pr-4"><Badge variant="info">GET</Badge></td>
                <td className="py-2 text-slate-600">Service health check</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">/api/v1/validate</td>
                <td className="py-2 pr-4"><Badge variant="info">POST</Badge></td>
                <td className="py-2 text-slate-600">Caller-supplied checklist validation</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">
            <strong>Status values:</strong>{" "}
            <code className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">preliminary_checks_passed</code>{" "}
            <code className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">attention_required</code>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            <strong>Finding codes:</strong>{" "}
            <code className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">MISSING_DOCUMENT</code>{" "}
            <code className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">DOCUMENT_EXPIRED</code>
          </p>
        </div>
      </Card>

      {/* Security */}
      <Card className="bg-slate-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <CardTitle className="text-sm">Security & Production Status</CardTitle>
          </div>
        </CardHeader>
        <div className="space-y-2 text-sm text-slate-500">
          <p>
            This tool has <strong>no authentication</strong>, no authorization, no tenant
            isolation, no persistent storage, and no audit trail. It is not
            production-ready and must not be used for real compliance decisions.
          </p>
          <p>
            No real institutional documents or personal data should be submitted.
            All example data uses synthetic identifiers (SYNTH-*).
          </p>
        </div>
      </Card>
    </div>
  );
}
