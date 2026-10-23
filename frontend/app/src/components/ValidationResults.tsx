import {
  CheckCircle2, AlertTriangle, Clock, FileX2,
  BarChart3, CalendarDays, Info
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "./Card";
import { Badge } from "./Badge";
import { Alert } from "./Alert";
import { FindingsTable } from "./FindingsTable";
import { DocumentChecklist } from "./DocumentChecklist";
import { ScopeNotice } from "./ScopeNotice";
import { Button } from "./Button";
import { formatTimestamp, humanizeApplicationType } from "@/lib/utils";
import type { ValidationResponse } from "@/lib/api";

interface ValidationResultsProps {
  data: ValidationResponse;
  onReset: () => void;
}

export function ValidationResults({ data, onReset }: ValidationResultsProps) {
  const isPassed = data.status === "preliminary_checks_passed";
  const missingCount = data.missing_documents.length;
  const expiredCount = data.expired_documents.length;
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ScopeNotice />

      {/* Status summary */}
      <Card className="p-6 shadow-sm sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className={
            isPassed
              ? "flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700"
              : "flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
          }>
            {isPassed ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <h1 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-navy-900 outline-none">
              {isPassed
                ? "Preliminary check complete"
                : "Attention required for review"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isPassed
                ? "The supplied document lists agree. This does not confirm regulatory compliance, document authenticity, or AICTE approval."
                : `${missingCount + expiredCount} checklist observation(s) require attention. Review the evidence below.`}
            </p>

            {/* Metadata */}
            <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <span><strong className="font-medium text-navy-900">Institution:</strong> {data.institution_id}</span>
              <span><strong className="font-medium text-navy-900">Application:</strong> {humanizeApplicationType(data.application_type)}</span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                Scope: {data.validation_scope.replace(/_/g, " ")}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Checked: {formatTimestamp(data.checked_at)}
              </span>
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Source: {data.source.replace(/_/g, " ")}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            {isPassed ? (
              <Badge variant="info">
                <CheckCircle2 className="h-3 w-3" />
                Lists agree
              </Badge>
            ) : (
              <Badge variant="warning">
                <AlertTriangle className="h-3 w-3" />
                Attention Required
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)] lg:items-start">
        <div className="space-y-6">
          {/* Summary stats */}
          {!isPassed && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {missingCount > 0 && (
                <Card className="border-l-4 border-l-red-500 p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700">
                      <FileX2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-navy-900">{missingCount}</p>
                      <p className="text-xs text-slate-600">Missing document{missingCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </Card>
              )}
              {expiredCount > 0 && (
                <Card className="border-l-4 border-l-amber-500 p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-navy-900">{expiredCount}</p>
                      <p className="text-xs text-slate-600">Expired document{expiredCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Findings table */}
          {data.findings.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Findings</CardTitle>
                <CardDescription>
                  These are checklist observations from the supplied inputs, not a compliance determination.
                </CardDescription>
              </CardHeader>
              <FindingsTable findings={data.findings} />
            </Card>
          )}

          {/* Document checklist */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Document checklist</CardTitle>
              <CardDescription>
                Documents identified in the validation response.
              </CardDescription>
            </CardHeader>
            <DocumentChecklist data={data} />
          </Card>
        </div>

        <aside className="space-y-6">
          <Alert variant="warning" title="Important notice">
            {data.notice}
          </Alert>

          <Card className="p-6 shadow-sm">
            <CardHeader>
              <CardTitle>Review next</CardTitle>
              <CardDescription>Use this result as a starting point for human review.</CardDescription>
            </CardHeader>
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              <li>Confirm the required list is the correct checklist for your process.</li>
              <li>Recheck any missing item against the source records.</li>
              <li>Independently verify every supplied expiry date.</li>
            </ul>
            <div className="mt-6 border-t border-slate-200 pt-5">
              <Button variant="primary" onClick={onReset} className="w-full">
                Run another check
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
