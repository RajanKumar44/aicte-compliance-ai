import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./Card";
import { Button } from "./Button";
import {
  ScanText,
  Stamp,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
} from "lucide-react";

interface OCRSampleDoc {
  id: string;
  documentType: string;
  filename: string;
  issuingAuthority: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  sealDetected: boolean;
  sealLabel: string;
  confidence: number;
  sha256: string;
}

const OCR_SAMPLES: OCRSampleDoc[] = [
  {
    id: "fire_noc_01",
    documentType: "Fire Safety Certificate",
    filename: "Fire_Safety_NOC_2024_2027.pdf",
    issuingAuthority: "Directorate of Fire and Emergency Services, State Govt.",
    certificateNumber: "NOC/DFS/MUM/2024/8912",
    issueDate: "2024-04-15",
    expiryDate: "2027-04-14",
    sealDetected: true,
    sealLabel: "Official Directorate Seal & Digital Signature Verified",
    confidence: 97.4,
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    id: "structural_cert_02",
    documentType: "Building Structural Stability Certificate",
    filename: "Structural_Stability_Audit_Report.pdf",
    issuingAuthority: "Chartered Structural Engineers Association (Empaneled)",
    certificateNumber: "SEC/AUDIT/ENGG/2023/451",
    issueDate: "2023-08-10",
    expiryDate: "2026-08-09",
    sealDetected: true,
    sealLabel: "Registered Structural Engineer Municipal Stamp & Bar Council Reg",
    confidence: 94.2,
    sha256: "a158b42298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852c914",
  },
  {
    id: "land_deed_03",
    documentType: "Land Ownership Deed / 30-Year Registered Lease",
    filename: "Registered_Land_Title_Deed.pdf",
    issuingAuthority: "Office of the Sub-Registrar, District Collectorate",
    certificateNumber: "REG/DEED/BK1/2021/1102",
    issueDate: "2021-01-20",
    expiryDate: "2051-01-19",
    sealDetected: true,
    sealLabel: "Revenue Department Official Embossed Seal Verified",
    confidence: 98.6,
    sha256: "f420c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852e128",
  },
];

interface DocumentOcrVerifierProps {
  onPopulateDate?: (documentName: string, date: string) => void;
  className?: string;
}

export function DocumentOcrVerifier({
  onPopulateDate,
  className = "",
}: DocumentOcrVerifierProps) {
  const [selectedDocId, setSelectedDocId] = useState<string>("fire_noc_01");
  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, boolean>>({});

  const activeDoc = OCR_SAMPLES.find((d) => d.id === selectedDocId) || OCR_SAMPLES[0];
  const isVerified = verifiedDocs[activeDoc.id] ?? false;

  const handleVerify = () => {
    setVerifiedDocs((prev) => ({ ...prev, [activeDoc.id]: true }));
    if (onPopulateDate) {
      onPopulateDate(activeDoc.documentType, activeDoc.expiryDate);
    }
  };

  return (
    <Card className={`border-border ${className}`}>
      <CardHeader className="border-b border-border bg-bg-1 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-500/15 text-accent-strong">
                <ScanText className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Document Authenticity & Extraction Assistant
              </p>
            </div>
            <CardTitle className="mt-1 text-lg font-bold text-text-heading">
              PDF / Certificate Metadata & Seal Verification
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary">
              Extract issuing authorities, dates, and official seals with human-in-the-loop review.
            </CardDescription>
          </div>

          {/* Sample Selectors */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-2 p-1">
            {OCR_SAMPLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedDocId(s.id)}
                className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                  selectedDocId === s.id
                    ? "bg-bg-1 text-text-heading shadow-sm border border-border"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                {s.documentType.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Side-by-Side Review Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: Certificate Specimen Card */}
          <div className="rounded-xl border border-border bg-bg-1 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent-strong" />
                <span className="font-bold text-xs text-text-heading truncate max-w-[200px]">
                  {activeDoc.filename}
                </span>
              </div>
              <span className="font-mono text-[10px] text-text-muted bg-bg-2 px-2 py-0.5 rounded border border-border">
                PDF Specimen
              </span>
            </div>

            {/* Simulated Certificate Preview Box */}
            <div className="rounded-lg border-2 border-dashed border-border bg-bg-0 p-5 space-y-4">
              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Official Statutory Clearance
                </p>
                <h4 className="text-sm font-extrabold text-text-heading">{activeDoc.documentType}</h4>
                <p className="text-[11px] text-text-secondary italic">{activeDoc.issuingAuthority}</p>
              </div>

              <div className="rounded border border-border bg-bg-1 p-3 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-text-muted">Ref No:</span>
                  <span className="font-bold text-text-heading">{activeDoc.certificateNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Issued:</span>
                  <span className="text-text-body">{activeDoc.issueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Valid Till:</span>
                  <span className="font-bold text-accent-strong">{activeDoc.expiryDate}</span>
                </div>
              </div>

              {/* Seal Stamp Badge */}
              <div className="flex items-center gap-2 rounded-md border border-accent-strong/40 bg-accent-strong/10 p-2.5 text-xs text-text-body">
                <Stamp className="h-4 w-4 text-accent-strong shrink-0" />
                <span className="text-[11px] font-semibold">{activeDoc.sealLabel}</span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-text-muted break-all">
              SHA-256: {activeDoc.sha256}
            </div>
          </div>

          {/* Right: Extracted Metadata & Human Verification */}
          <div className="rounded-xl border border-border bg-bg-1 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted">
                Extracted Provenance & Metadata
              </h4>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-success-text">
                  {activeDoc.confidence}% Confidence
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                  Detected Issuing Authority
                </span>
                <p className="font-bold text-text-heading text-sm">{activeDoc.issuingAuthority}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-bg-2 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                    Issue Date
                  </span>
                  <p className="font-mono font-bold text-text-heading">{activeDoc.issueDate}</p>
                </div>

                <div className="rounded-lg border border-border bg-bg-2 p-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                    Expiry Date
                  </span>
                  <p className="font-mono font-bold text-accent-strong">{activeDoc.expiryDate}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                  Statutory Certificate Identifier
                </span>
                <p className="font-mono font-bold text-text-heading bg-bg-0 p-2 rounded border border-border">
                  {activeDoc.certificateNumber}
                </p>
              </div>
            </div>

            {/* Human Verification Action */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Review Status:</span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-success-text">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Auditor Verified</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-warning-text">
                    <AlertCircle className="h-4 w-4" />
                    <span>Pending Human Confirmation</span>
                  </span>
                )}
              </div>

              <Button
                variant={isVerified ? "secondary" : "primary"}
                size="sm"
                fullWidth
                onClick={handleVerify}
                leftIcon={<ShieldCheck className="h-4 w-4" />}
              >
                {isVerified
                  ? "Re-Confirm & Populate into Workspace"
                  : "Confirm Extraction & Populate into Form"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
