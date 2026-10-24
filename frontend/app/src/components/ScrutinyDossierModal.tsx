import { Button } from "./Button";
import {
  Printer,
  Download,
  X,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { computeReadinessScore } from "@/lib/aicte-rules";

interface ScrutinyDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionId: string;
  institutionName?: string;
  applicationType: string;
  approvalYear?: string;
  requiredDocuments: string[];
  submittedDocuments: string[];
  expiryDates: Record<string, string>;
  checkedAt?: string;
}

export function ScrutinyDossierModal({
  isOpen,
  onClose,
  institutionId,
  institutionName = "Sample Engineering College",
  applicationType,
  approvalYear = "2026-2027",
  requiredDocuments,
  submittedDocuments,
  expiryDates,
  checkedAt = new Date().toISOString(),
}: ScrutinyDossierModalProps) {
  if (!isOpen) return null;

  const result = computeReadinessScore(requiredDocuments, submittedDocuments, expiryDates);
  const formattedDate = new Date(checkedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dossierData = {
      title: "AICTE Scrutiny Committee Evaluation Dossier",
      handbookCycle: "APH 2024–2027",
      institutionId,
      institutionName,
      applicationType,
      approvalYear,
      generatedAt: checkedAt,
      readinessScore: `${result.score}%`,
      complianceTier: result.tier,
      totalRequired: requiredDocuments.length,
      totalSubmitted: submittedDocuments.length,
      deficiencies: result.findings,
      documents: requiredDocuments.map((doc) => ({
        name: doc,
        submitted: submittedDocuments.includes(doc),
        expiryDate: expiryDates[doc] || "Statutory Indefinite",
      })),
    };

    const blob = new Blob([JSON.stringify(dossierData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aicte_scrutiny_dossier_${institutionId}_${approvalYear}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border-2 border-border bg-bg-1 shadow-2xl overflow-hidden">
        {/* Action Bar (Hidden in Print) */}
        <div className="no-print flex items-center justify-between border-b border-border bg-bg-2 px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent-strong" />
            <span className="font-bold text-sm text-text-heading">
              Official AICTE Scrutiny Dossier Package
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleDownloadJson} leftIcon={<Download className="h-4 w-4" />}>
              Download JSON
            </Button>
            <Button size="sm" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
              Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 rounded-lg p-1.5 text-text-muted hover:bg-bg-3 hover:text-text-heading"
              aria-label="Close dossier"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Dossier Content */}
        <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-8 bg-bg-0 text-text-body font-sans">
          {/* Official AICTE Letterhead */}
          <div className="border-b-2 border-text-heading pb-6 text-center space-y-2">
            <div className="inline-flex items-center justify-center p-2 rounded-full border border-border bg-bg-2 mb-1">
              <Shield className="h-8 w-8 text-accent-strong" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-text-heading">
              All India Council for Technical Education
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Scrutiny & Re-Scrutiny Committee Evaluation Dossier
            </p>
            <p className="text-[11px] font-semibold text-text-secondary">
              Approval Process Handbook (APH 2024–2027) · Extension of Approval / New Program Cycle
            </p>
          </div>

          {/* Institutional Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border border-border bg-bg-1 p-5 text-xs">
            <div>
              <span className="font-bold text-text-muted uppercase text-[10px] block">AICTE Permanent ID</span>
              <span className="font-mono font-bold text-text-heading text-sm">{institutionId}</span>
            </div>
            <div>
              <span className="font-bold text-text-muted uppercase text-[10px] block">Institution Name</span>
              <span className="font-semibold text-text-heading truncate block">{institutionName}</span>
            </div>
            <div>
              <span className="font-bold text-text-muted uppercase text-[10px] block">Application Track</span>
              <span className="font-semibold text-text-heading">{applicationType}</span>
            </div>
            <div>
              <span className="font-bold text-text-muted uppercase text-[10px] block">Evaluation Date</span>
              <span className="font-medium text-text-secondary">{formattedDate}</span>
            </div>
          </div>

          {/* Executive Verdict Banner */}
          <div
            className={`rounded-xl border p-5 space-y-2 ${
              result.tier === "ready_nil_deficiency"
                ? "border-success-border bg-success-bg/25"
                : result.tier === "conditional_minor_hearing"
                ? "border-warning-border bg-warning-bg/25"
                : "border-error-border bg-error-bg/25"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.tier === "ready_nil_deficiency" ? (
                  <CheckCircle2 className="h-5 w-5 text-success-text" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning-text" />
                )}
                <h3 className="font-extrabold text-sm text-text-heading">
                  Preliminary Evaluation Verdict: {result.label}
                </h3>
              </div>
              <span className="font-mono text-sm font-black text-text-heading bg-bg-1 px-3 py-1 rounded border border-border">
                Readiness: {result.score}%
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {result.summary}
            </p>
          </div>

          {/* Master Document Index Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-heading">
              1. Master Verification Index & Statutory Certificates
            </h4>
            <div className="rounded-lg border border-border overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-bg-2 text-text-muted font-bold uppercase text-[10px]">
                    <th className="p-3">S.No.</th>
                    <th className="p-3">Required Statutory Document</th>
                    <th className="p-3 text-center">Submission Status</th>
                    <th className="p-3 text-center">Expiry / Validity</th>
                    <th className="p-3 text-right">Committee Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-bg-1">
                  {requiredDocuments.map((doc, idx) => {
                    const isSubmitted = submittedDocuments.includes(doc);
                    const expiry = expiryDates[doc];
                    return (
                      <tr key={doc} className="hover:bg-bg-2/40">
                        <td className="p-3 font-mono text-text-muted">{idx + 1}</td>
                        <td className="p-3 font-semibold text-text-heading">{doc}</td>
                        <td className="p-3 text-center">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1 font-bold text-success-text">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Submitted</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-error-text">
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Missing</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {expiry ? (
                            <span className="font-medium text-text-body">{expiry}</span>
                          ) : (
                            <span className="text-text-muted">Statutory Indefinite</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono text-[11px] text-text-secondary">
                            [ &nbsp; ] Verified
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statutory Deficiencies & Mitigation Undertakings (if any) */}
          {result.findings.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-heading">
                2. Identified Discrepancies & Attached Mitigation Undertakings
              </h4>
              <div className="space-y-2.5">
                {result.findings.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-bg-1 p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-text-heading">
                      <span>{item.document} ({item.type.toUpperCase()})</span>
                      {item.clause && (
                        <span className="font-mono text-[10px] text-accent-strong bg-bg-2 px-2 py-0.5 rounded border border-border">
                          {item.clause.clause}
                        </span>
                      )}
                    </div>
                    <p className="text-text-secondary">{item.impact}</p>
                    <div className="rounded bg-bg-2 p-2 font-mono text-[10px] text-text-body border border-border">
                      <strong>Submitted Undertaking / Proof:</strong> {item.suggestedAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Committee Formal Sign-off Section */}
          <div className="pt-6 border-t-2 border-border space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-heading">
              3. Institutional Undertaking & Scrutiny Signatures
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center pt-8">
              <div className="space-y-8 border-t border-dashed border-border pt-3">
                <span className="text-xs font-bold text-text-heading block">
                  Principal / Director
                </span>
                <span className="text-[10px] text-text-muted block">
                  (Signature with Official Seal)
                </span>
              </div>
              <div className="space-y-8 border-t border-dashed border-border pt-3">
                <span className="text-xs font-bold text-text-heading block">
                  Scrutiny Committee Expert
                </span>
                <span className="text-[10px] text-text-muted block">
                  (Subject Expert Member)
                </span>
              </div>
              <div className="space-y-8 border-t border-dashed border-border pt-3">
                <span className="text-xs font-bold text-text-heading block">
                  AICTE Regional Officer
                </span>
                <span className="text-[10px] text-text-muted block">
                  (Member Secretary / Convener)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
