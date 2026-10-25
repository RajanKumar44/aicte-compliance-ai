import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./Card";
import { Button } from "./Button";
import {
  ScanText,
  Stamp,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileText,
  UploadCloud,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { analyzeDocument, type DocumentAnalysisResponse } from "../lib/api";

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

const STANDARD_DOCUMENT_TYPES = [
  "Fire Safety Certificate",
  "Building Structural Stability Certificate",
  "Land Ownership Deed / 30-Year Registered Lease",
  "Occupancy Certificate",
  "AICTE Approval Letter (EoA)",
  "Affiliating University NOC",
];

interface DocumentOcrVerifierProps {
  onPopulateDate?: (documentName: string, date: string) => void;
  className?: string;
}

export function DocumentOcrVerifier({
  onPopulateDate,
  className = "",
}: DocumentOcrVerifierProps) {
  const [mode, setMode] = useState<"upload" | "sample">("sample");
  const [selectedDocId, setSelectedDocId] = useState<string>("fire_noc_01");
  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, boolean>>({});

  // Real Upload state
  const [_uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResponse | null>(null);
  const [selectedTargetType, setSelectedTargetType] = useState<string>("Fire Safety Certificate");
  const [customExpiryDate, setCustomExpiryDate] = useState<string>("");
  const [isConfirmedUpload, setIsConfirmedUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeDoc = OCR_SAMPLES.find((d) => d.id === selectedDocId) || OCR_SAMPLES[0];
  const isSampleVerified = verifiedDocs[activeDoc.id] ?? false;

  const handleSampleVerify = () => {
    setVerifiedDocs((prev) => ({ ...prev, [activeDoc.id]: true }));
    if (onPopulateDate) {
      onPopulateDate(activeDoc.documentType, activeDoc.expiryDate);
    }
  };

  const handleFileProcess = async (file: File) => {
    setUploadError(null);
    setIsConfirmedUpload(false);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF documents (.pdf) are supported for regulatory compliance analysis.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File exceeds the 10 MiB limit. Please compress or optimize the PDF.");
      return;
    }

    setUploadedFile(file);
    setIsAnalyzing(true);

    const result = await analyzeDocument(file);
    setIsAnalyzing(false);

    if (result.ok) {
      setAnalysisResult(result.data);
      if (result.data.candidate_fields?.expiry_date) {
        setCustomExpiryDate(result.data.candidate_fields.expiry_date);
      } else {
        setCustomExpiryDate("");
      }
    } else {
      setAnalysisResult(null);
      const errMsg = result.errors.file || "Failed to analyze document. Ensure it is a valid non-encrypted PDF.";
      setUploadError(errMsg);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUploadConfirm = () => {
    if (!customExpiryDate) {
      setUploadError("Please provide an expiry date to populate into the validation workspace.");
      return;
    }
    setIsConfirmedUpload(true);
    if (onPopulateDate) {
      onPopulateDate(selectedTargetType, customExpiryDate);
    }
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setAnalysisResult(null);
    setUploadError(null);
    setIsConfirmedUpload(false);
    setCustomExpiryDate("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
              PDF Analysis & Metadata Verification
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary">
              Upload statutory certificates for in-memory text extraction, expiry detection, and human verification.
            </CardDescription>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-2 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                mode === "upload"
                  ? "bg-bg-1 text-text-heading shadow-sm border border-border"
                  : "text-text-muted hover:text-text-heading"
              }`}
            >
              Upload Real PDF
            </button>
            <button
              type="button"
              onClick={() => setMode("sample")}
              className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                mode === "sample"
                  ? "bg-bg-1 text-text-heading shadow-sm border border-border"
                  : "text-text-muted hover:text-text-heading"
              }`}
            >
              Sample Benchmarks
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {mode === "upload" ? (
          /* REAL PDF UPLOAD WORKFLOW */
          <div className="space-y-6">
            {!analysisResult && !isAnalyzing ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                  isDragging
                    ? "border-accent-strong bg-accent-strong/5"
                    : "border-border bg-bg-0 hover:border-border-focus"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileInputChange}
                  className="sr-only"
                  id="pdf-upload-input"
                />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10 text-accent-strong">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-text-heading">
                  Select or drag & drop a statutory PDF certificate
                </h4>
                <p className="mt-1 text-xs text-text-secondary max-w-md mx-auto">
                  Enforces strict PDF structure validation. Maximum file size: 10 MiB. Files are processed
                  securely in-memory and raw document contents are never retained.
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <label
                    htmlFor="pdf-upload-input"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md bg-accent-strong px-4 py-2 text-xs font-bold text-bg-0 shadow-sm transition hover:opacity-90"
                  >
                    Browse Local PDF
                  </label>
                </div>

                {uploadError && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-warning-text bg-warning-bg/40 p-2.5 rounded-lg border border-warning-border max-w-lg mx-auto">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            ) : isAnalyzing ? (
              <div className="rounded-xl border border-border bg-bg-0 p-12 text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-accent-strong mx-auto" />
                <h4 className="text-sm font-bold text-text-heading">
                  Analyzing PDF Structure & Statutory Metadata...
                </h4>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  Inspecting PDF header, checking encryption, extracting text streams, and parsing candidate dates.
                </p>
              </div>
            ) : analysisResult ? (
              <div className="space-y-6">
                {/* File Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-1 p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent-strong shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-text-heading truncate max-w-[280px]">
                        {analysisResult.filename}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {analysisResult.filesize_bytes ? `${(analysisResult.filesize_bytes / 1024).toFixed(1)} KB • ` : ""}
                        {analysisResult.page_count} {analysisResult.page_count === 1 ? "Page" : "Pages"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetUpload}
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                    >
                      Analyze Another PDF
                    </Button>
                  </div>
                </div>

                {/* Antivirus & OCR Status Indicators */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={`rounded-lg border p-3 text-xs flex items-start gap-2.5 ${
                    analysisResult.scan_status === "clean"
                      ? "border-success-border bg-success-bg/40 text-success-text"
                      : analysisResult.scan_status === "infected"
                      ? "border-error-border bg-error-bg/40 text-error-text"
                      : "border-warning-border bg-warning-bg/40 text-text-body"
                  }`}>
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-accent-strong" />
                    <div>
                      <p className="font-bold">
                        Antivirus Status: {
                          analysisResult.scan_status === "clean" ? "Clean (Verified)"
                          : analysisResult.scan_status === "infected" ? "Infected (Blocked)"
                          : "Scanner Unavailable"
                        }
                      </p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {analysisResult.scan_details || "File inspected for structural conformance and text extraction."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-bg-1 p-3 text-xs flex items-start gap-2.5 text-text-body">
                    <ScanText className="h-4 w-4 shrink-0 mt-0.5 text-accent-strong" />
                    <div>
                      <p className="font-bold">
                        OCR Pipeline: {
                          analysisResult.ocr_status === "completed" ? "OCR Engine Applied"
                          : analysisResult.ocr_status === "unavailable" ? "OCR Engine Unavailable"
                          : "Native Selectable PDF Stream"
                        }
                      </p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {analysisResult.ocr_status === "unavailable"
                          ? "Host environment lacks tesseract-ocr; text extraction used selectable font streams."
                          : "Text streams extracted and parsed for statutory clearance candidate dates."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scanned/Image Warning */}
                {analysisResult.is_scanned_only && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-warning-border bg-warning-bg/40 p-3.5 text-xs text-text-body">
                    <AlertTriangle className="h-4 w-4 text-warning-text shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-warning-text">Scanned / Raster PDF Detected</p>
                      <p className="mt-0.5 text-text-secondary">
                        This document does not contain an embedded selectable text layer. Extracted dates or
                        authorities may require manual entry from visual inspection.
                      </p>
                    </div>
                  </div>
                )}

                {/* Additional Warnings */}
                {analysisResult.warnings?.length > 0 && (
                  <div className="space-y-1">
                    {analysisResult.warnings.map((w, idx) => (
                      <p key={idx} className="text-xs text-warning-text flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{w}</span>
                      </p>
                    ))}
                  </div>
                )}

                {/* Side-by-Side Review Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left: Text Preview & Cryptographic Proof */}
                  <div className="rounded-xl border border-border bg-bg-1 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Extracted Document Text
                      </span>
                      <span className="font-mono text-[10px] text-text-muted bg-bg-2 px-2 py-0.5 rounded border border-border">
                        {analysisResult.is_scanned_only ? "Image Only" : "Selectable Stream"}
                      </span>
                    </div>

                    <div className="h-48 overflow-y-auto rounded-lg border border-border bg-bg-0 p-3 font-mono text-[11px] leading-relaxed text-text-body whitespace-pre-wrap">
                      {analysisResult.extracted_text_preview || "No selectable text stream found in PDF."}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                        SHA-256 Cryptographic Hash
                      </span>
                      <p className="font-mono text-[10px] text-text-muted bg-bg-0 p-2 rounded border border-border break-all">
                        {analysisResult.sha256}
                      </p>
                    </div>
                  </div>

                  {/* Right: Candidate Fields & Form Mapping */}
                  <div className="rounded-xl border border-border bg-bg-1 p-5 space-y-4">
                    <div className="border-b border-border pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Candidate Field Extraction & Mapping
                      </h4>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Verify and edit extracted values before populating into the compliance form.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                          Detected Issuing Authority
                        </label>
                        <p className="font-medium text-text-heading bg-bg-0 p-2 rounded border border-border">
                          {analysisResult.candidate_fields?.issuing_authority || "Not explicitly identified in text"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                          Certificate Identifier / Ref
                        </label>
                        <p className="font-mono text-text-heading bg-bg-0 p-2 rounded border border-border">
                          {analysisResult.candidate_fields?.certificate_number || "Not detected"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                            Detected Issue Date
                          </label>
                          <p className="font-mono text-text-body bg-bg-0 p-2 rounded border border-border">
                            {analysisResult.candidate_fields?.issue_date || "—"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                            Expiry Date (YYYY-MM-DD) *
                          </label>
                          <input
                            type="date"
                            value={customExpiryDate}
                            onChange={(e) => setCustomExpiryDate(e.target.value)}
                            className="w-full rounded border border-border bg-bg-0 px-2.5 py-1.5 font-mono text-xs font-bold text-accent-strong focus:border-accent-strong focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                          Target Document Requirement in Form
                        </label>
                        <select
                          value={selectedTargetType}
                          onChange={(e) => setSelectedTargetType(e.target.value)}
                          className="w-full rounded border border-border bg-bg-0 px-2.5 py-1.5 text-xs text-text-heading focus:border-accent-strong focus:outline-none"
                        >
                          {STANDARD_DOCUMENT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Action & Regulatory Notice */}
                    <div className="border-t border-border pt-3 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Verification Status:</span>
                        {isConfirmedUpload ? (
                          <span className="inline-flex items-center gap-1 font-bold text-success-text">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Populated into Form</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-warning-text">
                            <AlertCircle className="h-4 w-4" />
                            <span>Requires Auditor Confirmation</span>
                          </span>
                        )}
                      </div>

                      <Button
                        variant={isConfirmedUpload ? "secondary" : "primary"}
                        size="sm"
                        fullWidth
                        onClick={handleUploadConfirm}
                        leftIcon={<ShieldCheck className="h-4 w-4" />}
                      >
                        {isConfirmedUpload
                          ? "Re-Populate into Validation Form"
                          : "Confirm & Populate Expiry Date into Form"}
                      </Button>

                      <p className="text-[10px] text-text-muted leading-relaxed">
                        {analysisResult.notice}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* SAMPLE BENCHMARK SPECIMENS */
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Select Preloaded Benchmark:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {OCR_SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedDocId(s.id)}
                    className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                      selectedDocId === s.id
                        ? "bg-bg-0 text-text-heading shadow-sm border border-border"
                        : "text-text-muted hover:text-text-heading"
                    }`}
                  >
                    {s.documentType.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left: Specimen */}
              <div className="rounded-xl border border-border bg-bg-1 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent-strong" />
                    <span className="font-bold text-xs text-text-heading truncate max-w-[200px]">
                      {activeDoc.filename}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-text-muted bg-bg-2 px-2 py-0.5 rounded border border-border">
                    Preloaded Specimen
                  </span>
                </div>

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

                  <div className="flex items-center gap-2 rounded-md border border-accent-strong/40 bg-accent-strong/10 p-2.5 text-xs text-text-body">
                    <Stamp className="h-4 w-4 text-accent-strong shrink-0" />
                    <span className="text-[11px] font-semibold">{activeDoc.sealLabel}</span>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-text-muted break-all">
                  SHA-256: {activeDoc.sha256}
                </div>
              </div>

              {/* Right: Metadata */}
              <div className="rounded-xl border border-border bg-bg-1 p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-text-muted">
                    Extracted Provenance & Metadata
                  </h4>
                  <span className="text-[11px] font-bold text-success-text">
                    {activeDoc.confidence}% Confidence
                  </span>
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

                <div className="pt-2 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Review Status:</span>
                    {isSampleVerified ? (
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
                    variant={isSampleVerified ? "secondary" : "primary"}
                    size="sm"
                    fullWidth
                    onClick={handleSampleVerify}
                    leftIcon={<ShieldCheck className="h-4 w-4" />}
                  >
                    {isSampleVerified
                      ? "Re-Confirm & Populate into Workspace"
                      : "Confirm Extraction & Populate into Form"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
