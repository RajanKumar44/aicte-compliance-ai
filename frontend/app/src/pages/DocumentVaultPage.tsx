import { DocumentOcrVerifier } from "@/components/DocumentOcrVerifier";
import { ScopeNotice } from "@/components/ScopeNotice";
import { Archive, ShieldCheck, FileText, Lock } from "lucide-react";

export function DocumentVaultPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-1 px-3 py-1 text-xs font-medium text-text-secondary">
          <Archive className="h-3.5 w-3.5 text-accent-strong" />
          <span>Statutory Compliance Archival</span>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-text-heading sm:text-4xl">
          Institutional Document Vault & Verification
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-text-secondary sm:text-base">
          Upload, scan, analyze, and manage regulatory PDF certificates. Built-in ClamAV antivirus protocol, OCR text extraction, and encrypted cloud storage for preliminary AICTE scrutiny preparedness.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg-1 p-4 space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-strong/10 text-accent-strong">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-heading">
            Malware & Hygiene Scanning
          </h3>
          <p className="text-xs text-text-secondary">
            Integrates ClamAV daemon antivirus verification. Rejects infected or structurally corrupted PDFs before ingestion.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-bg-1 p-4 space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-strong/10 text-accent-strong">
            <FileText className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-heading">
            OCR & Metadata Extraction
          </h3>
          <p className="text-xs text-text-secondary">
            Parses certificate numbers, issuing authorities, issue dates, and expiry dates to eliminate manual transcription errors.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-bg-1 p-4 space-y-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-strong/10 text-accent-strong">
            <Lock className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-heading">
            Auditable Vault Storage
          </h3>
          <p className="text-xs text-text-secondary">
            Row-Level Security (RLS) ensures certificates are strictly isolated by institution for multi-year regulatory cycles.
          </p>
        </div>
      </div>

      {/* Main OCR & Vault Workspace Component */}
      <DocumentOcrVerifier />

      {/* Disclaimer */}
      <ScopeNotice />
    </div>
  );
}

