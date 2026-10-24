import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./Card";
import { Button } from "./Button";
import {
  Clock3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Copy,
  Check,
  Building,
} from "lucide-react";

interface ExpiryWatchdogMatrixProps {
  expiryDates: Record<string, string>;
  submittedDocuments?: string[];
  institutionName?: string;
  institutionId?: string;
  className?: string;
}

interface ExpiryItem {
  document: string;
  dateStr: string;
  daysRemaining: number;
  status: "valid" | "expiring_soon" | "expired";
  authority: string;
}

export function ExpiryWatchdogMatrix({
  expiryDates,
  institutionName = "Institutional Campus",
  institutionId = "AICTE-INST-APP",
  className = "",
}: ExpiryWatchdogMatrixProps) {
  const [selectedMemoDoc, setSelectedMemoDoc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const today = new Date();

  const items: ExpiryItem[] = Object.entries(expiryDates).map(([doc, dateStr]) => {
    const expDate = new Date(dateStr);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: ExpiryItem["status"] = "valid";
    if (diffDays < 0) status = "expired";
    else if (diffDays <= 60) status = "expiring_soon";

    let authority = "Municipal Corporation / Local Body";
    if (doc.toLowerCase().includes("fire")) authority = "Directorate of Fire and Emergency Services";
    else if (doc.toLowerCase().includes("structural")) authority = "Chartered / Registered Structural Engineer";
    else if (doc.toLowerCase().includes("pollution")) authority = "State Pollution Control Board";
    else if (doc.toLowerCase().includes("land")) authority = "Sub-Registrar & Revenue Department";
    else if (doc.toLowerCase().includes("nba")) authority = "National Board of Accreditation";

    return {
      document: doc,
      dateStr,
      daysRemaining: diffDays,
      status,
      authority,
    };
  });

  const expiredCount = items.filter((i) => i.status === "expired").length;
  const expiringSoonCount = items.filter((i) => i.status === "expiring_soon").length;
  const validCount = items.filter((i) => i.status === "valid").length;

  const generateRequisitionMemo = (docName: string, authority: string) => {
    const dateFormatted = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return `REF: ${institutionId}/COMPLIANCE/APH-RENEWAL/${new Date().getFullYear()}
DATE: ${dateFormatted}

TO:
The Competent Officer,
${authority}

SUBJECT: URGENT RENEWAL REQUISITION FOR ${docName.toUpperCase()}
FOR AICTE APPROVAL PROCESS (ACADEMIC YEAR 2024–2027)

Respected Sir/Madam,

This is to bring to your kind notice that ${institutionName} (AICTE Permanent Institute ID: ${institutionId}) is in the process of submitting the statutory documentation for the Extension of Approval (EoA) / Scrutiny Committee under the AICTE Approval Process Handbook (APH 2024–2027).

The validity of the institution's existing ${docName} requires statutory renewal to maintain uninterrupted compliance during upcoming unannounced Expert Visit Committee (EVC) surprise inspections.

We request your esteemed office to kindly conduct the necessary physical inspection and issue the renewed Certificate / NOC at your earliest convenience.

Enclosures:
1. Copy of Previous Certificate / NOC
2. Site Blueprint & Structural Ingress Plan
3. Statutory Inspection Fee Challan

Authorized Signatory,
Principal / Director
${institutionName}`;
  };

  const handleCopyMemo = (memo: string) => {
    void navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (items.length === 0) {
    return (
      <Card className={`border-border ${className}`}>
        <CardContent className="p-6 text-center text-sm text-text-muted">
          No document expiry dates provided in this scrutiny snapshot.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-border ${className}`}>
      <CardHeader className="border-b border-border bg-bg-1 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-info-bg/30 text-info-text">
                <Clock3 className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Statutory Validity Timeline
              </p>
            </div>
            <CardTitle className="mt-1 text-lg font-bold text-text-heading">
              Document Expiry Watchdog & Timeline Matrix
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary">
              Monitors certificate lifespans to prevent surprise EVC inspection disqualifications.
            </CardDescription>
          </div>

          {/* Quick Status Badges */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success-border bg-success-bg/30 px-3 py-1 text-xs font-bold text-success-text">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{validCount} Safe</span>
            </span>
            {expiringSoonCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-border bg-warning-bg/30 px-3 py-1 text-xs font-bold text-warning-text">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{expiringSoonCount} &lt;60d</span>
              </span>
            )}
            {expiredCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-error-border bg-error-bg/30 px-3 py-1 text-xs font-bold text-error-text">
                <XCircle className="h-3.5 w-3.5" />
                <span>{expiredCount} Expired</span>
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-5 sm:p-6">
        {/* Timeline Matrix Table */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-bg-2 text-text-muted font-bold uppercase tracking-wider">
                <th className="p-3.5">Statutory Document</th>
                <th className="p-3.5">Issuing Authority</th>
                <th className="p-3.5">Registered Expiry</th>
                <th className="p-3.5">Lifespan Status</th>
                <th className="p-3.5 text-right">Requisition Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg-1">
              {items.map((item) => (
                <tr key={item.document} className="hover:bg-bg-2/50 transition-colors">
                  <td className="p-3.5 font-bold text-text-heading">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-accent-strong" />
                      <span>{item.document}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-text-muted" />
                      <span className="truncate max-w-[200px]">{item.authority}</span>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-text-body font-semibold">
                    {item.dateStr}
                  </td>
                  <td className="p-3.5">
                    {item.status === "expired" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-error-bg border border-error-border px-2.5 py-0.5 text-[11px] font-bold text-error-text">
                        <XCircle className="h-3 w-3" />
                        <span>Expired {Math.abs(item.daysRemaining)}d ago</span>
                      </span>
                    ) : item.status === "expiring_soon" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg border border-warning-border px-2.5 py-0.5 text-[11px] font-bold text-warning-text">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{item.daysRemaining} days left</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg border border-success-border px-2.5 py-0.5 text-[11px] font-bold text-success-text">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Valid ({item.daysRemaining}d)</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 font-bold"
                      onClick={() =>
                        setSelectedMemoDoc(
                          selectedMemoDoc === item.document ? null : item.document
                        )
                      }
                    >
                      {selectedMemoDoc === item.document ? "Close Memo" : "Generate Memo"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Document Renewal Requisition Draft */}
        {selectedMemoDoc && (
          <div className="rounded-xl border border-border bg-bg-2 p-5 space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent-strong" />
                <h4 className="font-bold text-sm text-text-heading">
                  Official Renewal Requisition Draft: {selectedMemoDoc}
                </h4>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const item = items.find((i) => i.document === selectedMemoDoc);
                  if (item) {
                    handleCopyMemo(generateRequisitionMemo(item.document, item.authority));
                  }
                }}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-success-text" />
                    <span>Copied Memo!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    <span>Copy Formal Letter</span>
                  </>
                )}
              </Button>
            </div>

            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-text-secondary bg-bg-0 p-4 rounded-lg border border-border select-all max-h-72 overflow-y-auto">
              {(() => {
                const item = items.find((i) => i.document === selectedMemoDoc);
                return item ? generateRequisitionMemo(item.document, item.authority) : "";
              })()}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
