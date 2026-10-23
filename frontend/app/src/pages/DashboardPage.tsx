import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck, ArrowRight, Shield, FileSearch, AlertTriangle,
  BookOpen
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Button } from "@/components/Button";
import { ScopeNotice } from "@/components/ScopeNotice";
import { Badge } from "@/components/Badge";
import { PageHeader } from "@/components/PageHeader";

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Evidence-first workspace"
        title="Preliminary document checks"
        description="Compare a required-document list with the submitted list you provide, then review missing items and supplied expiry dates before human review."
        actions={<Badge variant="neutral">Demo · preliminary checks only</Badge>}
      />

      <ScopeNotice />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card className="border-teal-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-full flex-col justify-between gap-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Next action</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy-900">
                  Start a preliminary check
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Enter institution details and caller-supplied document lists.
                  No files are uploaded or authenticated by this prototype.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">Typical flow: context → lists → findings</p>
              <Button onClick={() => navigate("/validate")} className="gap-2">
                Begin check
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        <Card className="border-navy-800 bg-navy-900 p-6 text-white shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">How it works</p>
          <ol className="mt-6 space-y-5">
            {[
              "Choose an application type and identify the institution.",
              "Compare the required and submitted document names.",
              "Review missing or expired observations with their evidence.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-navy-600 text-xs font-semibold text-teal-300">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-slate-200">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supported today</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-navy-900">A focused review surface</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: FileSearch, title: "Checklist comparison", text: "Compares your required-document list against submitted documents to identify missing items." },
            { icon: AlertTriangle, title: "Expiry observations", text: "Checks supplied expiry dates against the server date; the dates still require independent review." },
            { icon: BookOpen, title: "Evidence review", text: "Keeps finding messages and evidence visible so a reviewer can understand the observation." },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-navy-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-slate-200 bg-slate-100/70 p-6 shadow-none sm:p-8">
        <CardHeader className="mb-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-600" />
            <CardTitle className="text-sm">Prototype boundaries</CardTitle>
          </div>
        </CardHeader>
        <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
          <p>No official AICTE regulatory ruleset is loaded.</p>
          <p>Document authenticity is not verified.</p>
          <p>No persistent storage or activity history exists.</p>
          <p>No authentication or role-based access exists.</p>
          <p>No document upload or OCR capability is exposed.</p>
          <p>Results are preliminary observations for human review.</p>
        </div>
      </Card>
    </div>
  );
}
