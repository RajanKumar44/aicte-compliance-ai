import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck, ArrowRight, Shield, FileSearch, AlertTriangle,
  BookOpen
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { ScopeNotice } from "@/components/ScopeNotice";

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl space-y-6">
      {/* Hero section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">
          Document Validation
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Compare required documents against submitted documents for AICTE
          application types. Review checklist completeness and document expiry dates.
        </p>
      </div>

      <ScopeNotice />

      {/* Quick actions */}
      <Card className="border-l-4 border-l-teal-600">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 shrink-0">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-navy-900">
                Start a Validation
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter institution details, required documents, and submitted
                documents to check for missing or expired items.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/validate")} className="shrink-0 gap-2">
            Begin Validation
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* What this tool does */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 mb-3">
            <FileSearch className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-navy-900">Checklist Comparison</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Compares your required-document list against submitted documents
            to identify missing items.
          </p>
        </Card>
        <Card>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 mb-3">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-navy-900">Expiry Detection</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Checks supplied expiry dates against the current date. Expiry
            dates are caller-supplied and require independent verification.
          </p>
        </Card>
        <Card>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 mb-3">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-navy-900">Evidence Review</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Findings include evidence details for review. All results are
            preliminary and require human verification.
          </p>
        </Card>
      </div>

      {/* Limitations */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <CardTitle className="text-sm">Current Limitations</CardTitle>
          </div>
        </CardHeader>
        <ul className="space-y-2 text-sm text-slate-500 list-disc pl-5">
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
