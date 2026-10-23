import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck, ArrowRight, Shield, FileSearch, AlertTriangle,
  BookOpen
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { ScopeNotice } from "@/components/ScopeNotice";
import { Badge } from "@/components/Badge";

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl space-y-6">
      {/* Hero section */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-teal-700">Evidence-first workspace</p>
          <Badge variant="neutral">Demo · preliminary checks only</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
          Preliminary document checks
        </h1>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          Compare a required-document list with the submitted list you provide,
          then review missing items and supplied expiry dates before human review.
        </p>
      </div>

      <ScopeNotice />

      {/* Quick actions */}
      <Card className="border-l-4 border-l-teal-600">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shrink-0">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-navy-900">
                Start a preliminary check
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter institution details and caller-supplied document lists.
                No files are uploaded or authenticated by this prototype.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/validate")} className="shrink-0 gap-2">
            Begin check
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* What this tool does */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 mb-3">
            <FileSearch className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-navy-900">Checklist comparison</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Compares your required-document list against submitted documents
            to identify missing items.
          </p>
        </Card>
        <Card>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 mb-3">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-navy-900">Expiry observations</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Checks supplied expiry dates against the current date. Expiry
            dates are caller-supplied and require independent verification.
          </p>
        </Card>
        <Card>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 mb-3">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-navy-900">Evidence review</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Findings include evidence details for review. All results are
            preliminary and require human verification.
          </p>
        </Card>
      </div>

      {/* Limitations */}
      <Card className="border-slate-200 bg-slate-100/70">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <CardTitle className="text-sm">Current Limitations</CardTitle>
          </div>
        </CardHeader>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>No official AICTE regulatory ruleset is loaded.</li>
          <li>Document authenticity is not verified.</li>
          <li>No persistent storage — results are session-only.</li>
          <li>No authentication or role-based access.</li>
          <li>No document upload or OCR capability.</li>
        </ul>
      </Card>
    </div>
  );
}
