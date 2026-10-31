import { useState, useEffect, useMemo, useRef, type ChangeEvent, type DragEvent } from "react";
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
  Archive,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  Search,
  X,
  Sparkles,
  Edit3,
  Printer,
  FileCheck,
  Check,
} from "lucide-react";
import {
  analyzeDocument,
  fetchDocuments,
  downloadStoredDocument,
  deleteStoredDocument,
  uploadAndStoreDocument,
  updateStoredDocument,
  type DocumentAnalysisResponse,
  type StoredDocument,
} from "../lib/api";
import { useAuth } from "./useAuth";

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

export const MANDATORY_AICTE_CHECKLIST = [
  { key: "Fire Safety Certificate", label: "Fire Safety NOC", category: "Safety & Fire", isPermanent: false },
  { key: "Building Structural Stability Certificate", label: "Structural Stability", category: "Infrastructure", isPermanent: false },
  { key: "Land Ownership Deed / 30-Year Registered Lease", label: "Land Title / 30-Yr Lease", category: "Infrastructure", isPermanent: true },
  { key: "Occupancy Certificate", label: "Occupancy Certificate", category: "Infrastructure", isPermanent: true },
  { key: "AICTE Approval Letter (EoA)", label: "Previous AICTE EoA", category: "Approvals", isPermanent: false },
  { key: "Affiliating University NOC", label: "University Affiliation NOC", category: "Approvals", isPermanent: false },
] as const;

interface DocumentOcrVerifierProps {
  onPopulateDate?: (documentName: string, date: string) => void;
  className?: string;
}

export function DocumentOcrVerifier({
  onPopulateDate,
  className = "",
}: DocumentOcrVerifierProps) {
  const { session, user } = useAuth();
  const token = session?.access_token;
  const institutionName = (user?.user_metadata?.full_name as string) || "Technical Institute";
  const institutionCode = (user?.user_metadata?.institution_id as string) || "SYNTH-INST-001";

  const [mode, setMode] = useState<"upload" | "vault" | "sample">("upload");
  const [selectedDocId, setSelectedDocId] = useState<string>("fire_noc_01");
  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, boolean>>({});

  // Real Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResponse | null>(null);
  const [selectedTargetType, setSelectedTargetType] = useState<string>("Fire Safety Certificate");
  const [customExpiryDate, setCustomExpiryDate] = useState<string>("");
  const [isConfirmedUpload, setIsConfirmedUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vault upload / persistence state
  const [isSavingToVault, setIsSavingToVault] = useState(false);
  const [vaultSaveSuccess, setVaultSaveSuccess] = useState<string | null>(null);
  const [vaultSaveError, setVaultSaveError] = useState<string | null>(null);

  // Stored Documents Vault state
  const [vaultDocs, setVaultDocs] = useState<StoredDocument[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Real-world Vault Filtering & Inspection state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expiryFilter, setExpiryFilter] = useState<string>("all");
  const [inspectedDoc, setInspectedDoc] = useState<StoredDocument | null>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editAuthority, setEditAuthority] = useState("");
  const [editCertNo, setEditCertNo] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editStatus, setEditStatus] = useState<string>("pending");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Scrutiny Dossier Modal
  const [showDossierModal, setShowDossierModal] = useState(false);

  const activeDoc = OCR_SAMPLES.find((d) => d.id === selectedDocId) || OCR_SAMPLES[0];
  const isSampleVerified = verifiedDocs[activeDoc.id] ?? false;

  const handleSampleVerify = () => {
    setVerifiedDocs((prev) => ({ ...prev, [activeDoc.id]: true }));
    if (onPopulateDate) {
      onPopulateDate(activeDoc.documentType, activeDoc.expiryDate);
    }
  };

  const loadVaultDocuments = async () => {
    setVaultLoading(true);
    setVaultError(null);
    if (!token) {
      setVaultLoading(false);
      setVaultError("Sign in to view institution documents.");
      return;
    }
    const result = await fetchDocuments(token);
    setVaultLoading(false);
    if (result.ok) {
      setVaultDocs(result.data);
    } else {
      setVaultError("Unable to retrieve stored vault certificates.");
    }
  };

  useEffect(() => {
    void loadVaultDocuments();
  }, [token]);

  const handleFileProcess = async (file: File) => {
    setUploadError(null);
    setIsConfirmedUpload(false);
    setVaultSaveSuccess(null);
    setVaultSaveError(null);

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

    if (!token) {
      setIsAnalyzing(false);
      setUploadError("Sign in before analyzing or storing a document.");
      return;
    }
    const result = await analyzeDocument(file, token);
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

  const handleSaveToVault = async () => {
    if (!uploadedFile) return;
    setIsSavingToVault(true);
    setVaultSaveError(null);
    setVaultSaveSuccess(null);

    if (!token) {
      setVaultSaveError("Sign in before storing a document.");
      return;
    }
    const result = await uploadAndStoreDocument(uploadedFile, token, {
      documentType: selectedTargetType,
    });
    setIsSavingToVault(false);

    if (result.ok) {
      setVaultSaveSuccess("Certificate stored in institutional vault successfully!");
      void loadVaultDocuments();
    } else {
      setVaultSaveError(result.errors.file || "Failed to save document to vault.");
    }
  };

  const handleDownloadDoc = async (doc: StoredDocument) => {
    setDownloadingId(doc.id);
    if (!token) {
      alert("Sign in before downloading a document.");
      return;
    }
    const res = await downloadStoredDocument(doc.id, doc.filename, token);
    setDownloadingId(null);
    if (!res.ok) {
      alert(res.error || "Download failed.");
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm("Document versions are retained in the institutional vault. Continue to request deletion?")) {
      return;
    }
    if (!token) {
      alert("Sign in before deleting a document.");
      return;
    }
    setDeletingId(docId);
    const res = await deleteStoredDocument(docId, token);
    setDeletingId(null);
    if (res.ok) {
      setVaultDocs((prev) => prev.filter((d) => d.id !== docId));
      if (inspectedDoc?.id === docId) {
        setInspectedDoc(null);
      }
    } else {
      alert(res.errors.document || res.errors._server || "Failed to delete document.");
    }
  };

  const handleOpenInspect = (doc: StoredDocument) => {
    setInspectedDoc(doc);
    setIsEditingMetadata(false);
    const cf = doc.extracted_metadata?.candidate_fields as Record<string, unknown> | undefined;
    setEditAuthority((cf?.issuing_authority as string) || doc.issuing_authority || "");
    setEditCertNo((cf?.certificate_number as string) || doc.certificate_number || "");
    setEditExpiryDate((cf?.expiry_date as string) || doc.custom_expiry_date || "");
    setEditStatus(doc.scrutiny_status || "pending");
  };

  const handleSaveMetadataChanges = async () => {
    if (!inspectedDoc) return;
    if (!token) {
      alert("Sign in before updating document metadata.");
      return;
    }
    setIsSavingEdit(true);

    const existingMetadata = inspectedDoc.extracted_metadata || {};
    const existingCf = (existingMetadata.candidate_fields as Record<string, unknown>) || {};

    const updatedCandidateFields = {
      ...existingCf,
      issuing_authority: editAuthority,
      certificate_number: editCertNo,
      expiry_date: editExpiryDate,
    };

    const updatedMetadata = {
      ...existingMetadata,
      candidate_fields: updatedCandidateFields,
    };

    const res = await updateStoredDocument(
      inspectedDoc.id,
      {
        extracted_metadata: updatedMetadata,
        scrutiny_status: editStatus as "verified" | "pending" | "needs_renewal" | "flagged",
        issuing_authority: editAuthority,
        certificate_number: editCertNo,
        custom_expiry_date: editExpiryDate,
      },
      token
    );

    setIsSavingEdit(false);
    if (res.ok) {
      setInspectedDoc(res.data);
      setIsEditingMetadata(false);
      void loadVaultDocuments();
    } else {
      alert(res.errors.document || res.errors._server || "Failed to save changes to document metadata.");
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
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
    setVaultSaveSuccess(null);
    setVaultSaveError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Real-world calculations: AICTE Checklist Completeness & Expiry Watchdog
  const vaultChecklistStatus = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const depositedTypes = new Map<string, StoredDocument>();

    for (const doc of vaultDocs) {
      if (!depositedTypes.has(doc.document_type)) {
        depositedTypes.set(doc.document_type, doc);
      }
    }

    const items = MANDATORY_AICTE_CHECKLIST.map((item) => {
      const doc = depositedTypes.get(item.key);
      let expiry = "";
      if (doc?.extracted_metadata?.candidate_fields && typeof doc.extracted_metadata.candidate_fields === "object") {
        const cf = doc.extracted_metadata.candidate_fields as Record<string, unknown>;
        expiry = String(cf.expiry_date || "");
      } else if (doc?.custom_expiry_date) {
        expiry = doc.custom_expiry_date;
      }

      let isExpired = false;
      let isExpiringSoon = false;
      if (expiry && !item.isPermanent) {
        const diffDays = Math.ceil((new Date(expiry).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 0) isExpired = true;
        else if (diffDays <= 60) isExpiringSoon = true;
      }

      return {
        ...item,
        deposited: Boolean(doc),
        document: doc,
        expiry,
        isExpired,
        isExpiringSoon,
      };
    });

    const depositedCount = items.filter((i) => i.deposited).length;
    const percentage = Math.round((depositedCount / MANDATORY_AICTE_CHECKLIST.length) * 100);

    return { items, depositedCount, percentage };
  }, [vaultDocs]);

  // Filtered documents for vault display
  const filteredVaultDocs = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return vaultDocs.filter((doc) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        categoryFilter === "all" ||
        (categoryFilter === "safety" && doc.document_type.toLowerCase().includes("fire")) ||
        (categoryFilter === "infrastructure" &&
          (doc.document_type.toLowerCase().includes("stability") ||
            doc.document_type.toLowerCase().includes("land") ||
            doc.document_type.toLowerCase().includes("occupancy"))) ||
        (categoryFilter === "approvals" &&
          (doc.document_type.toLowerCase().includes("approval") ||
            doc.document_type.toLowerCase().includes("noc") ||
            doc.document_type.toLowerCase().includes("eoa")));

      let matchesExpiry = true;
      const cf = doc.extracted_metadata?.candidate_fields as Record<string, unknown> | undefined;
      const expiry = (cf?.expiry_date as string) || doc.custom_expiry_date || "";

      if (expiryFilter !== "all") {
        if (!expiry) {
          matchesExpiry = expiryFilter === "permanent";
        } else {
          const diffDays = Math.ceil((new Date(expiry).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24));
          if (expiryFilter === "expired") matchesExpiry = diffDays <= 0;
          else if (expiryFilter === "expiring_soon") matchesExpiry = diffDays > 0 && diffDays <= 60;
          else if (expiryFilter === "valid") matchesExpiry = diffDays > 60;
        }
      }

      return matchesSearch && matchesCat && matchesExpiry;
    });
  }, [vaultDocs, searchQuery, categoryFilter, expiryFilter]);

  const handleAutoPopulateFormFromVault = () => {
    if (!onPopulateDate) return;
    let populatedCount = 0;
    for (const item of vaultChecklistStatus.items) {
      if (item.deposited && item.expiry) {
        onPopulateDate(item.key, item.expiry);
        populatedCount++;
      }
    }
    alert(`Successfully populated ${populatedCount} deposited certificate expiry dates into the compliance form!`);
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
              PDF Analysis & Document Vault
            </CardTitle>
            <CardDescription className="text-xs text-text-secondary">
              Upload statutory certificates for in-memory text extraction, expiry detection, security scanning, and institutional archival.
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
              onClick={() => setMode("vault")}
              className={`rounded px-3 py-1 text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === "vault"
                  ? "bg-bg-1 text-text-heading shadow-sm border border-border"
                  : "text-text-muted hover:text-text-heading"
              }`}
            >
              <Archive className="h-3 w-3" />
              Document Vault ({vaultDocs.length})
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
              /* ENTIRE BOX IS FULLY CLICKABLE VIA NATIVE LABEL ON INPUT */
              <label
                htmlFor="pdf-upload-input"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`group relative block w-full cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all select-none ${
                  isDragging
                    ? "border-accent-strong bg-accent-strong/10 scale-[1.01] shadow-md ring-2 ring-accent-strong/20"
                    : "border-border bg-bg-0 hover:border-accent-strong hover:bg-bg-1/80 shadow-sm"
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="pdf-upload-input"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileInputChange}
                  className="sr-only"
                />
                <div className="pointer-events-none mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-500/10 text-accent-strong transition-transform group-hover:scale-110">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h4 className="pointer-events-none mt-3.5 text-base font-bold text-text-heading group-hover:text-accent-strong transition-colors">
                  Click anywhere in this box or drag & drop a statutory PDF certificate
                </h4>
                <p className="pointer-events-none mt-1 text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
                  Enforces strict PDF structure validation. Maximum file size: 10 MiB. Files are processed
                  securely in-memory with ClamAV malware scanning and text extraction.
                </p>

                <div className="pointer-events-none mt-4 flex items-center justify-center gap-3">
                  <span className="inline-flex items-center justify-center rounded-md bg-accent-strong px-4 py-2 text-xs font-bold text-bg-0 shadow-sm transition group-hover:opacity-95">
                    Select PDF from Device
                  </span>
                </div>

                {uploadError && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-warning-text bg-warning-bg/40 p-2.5 rounded-lg border border-warning-border max-w-lg mx-auto">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </label>
            ) : isAnalyzing ? (
              <div className="rounded-xl border border-border bg-bg-0 p-12 text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-accent-strong mx-auto" />
                <h4 className="text-sm font-bold text-text-heading">
                  Analyzing PDF Structure & Statutory Metadata...
                </h4>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  Inspecting PDF header, running antivirus validation, checking OCR availability, extracting text streams, and parsing candidate dates.
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
                    <Button variant="ghost" size="sm" onClick={resetUpload} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
                      Upload Another
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveToVault}
                      disabled={isSavingToVault || Boolean(vaultSaveSuccess)}
                      leftIcon={isSavingToVault ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                    >
                      {vaultSaveSuccess ? "Deposited in Vault" : isSavingToVault ? "Storing..." : "Deposit in Vault"}
                    </Button>
                  </div>
                </div>

                {vaultSaveSuccess && (
                  <div className="rounded-lg border border-success-border bg-success-bg/30 p-3 text-xs text-success-text flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      {vaultSaveSuccess}
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => setMode("vault")}>
                      View in Vault
                    </Button>
                  </div>
                )}

                {vaultSaveError && (
                  <div className="rounded-lg border border-error-border bg-error-bg/30 p-3 text-xs text-error-text flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{vaultSaveError}</span>
                  </div>
                )}

                {/* Analysis Layout */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left Column: Security & Extraction */}
                  <div className="space-y-4">
                    {/* Antivirus & Hygiene Card */}
                    <div className="rounded-xl border border-border bg-bg-1 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                          Malware Scan & File Hygiene
                        </span>
                        {analysisResult.scan_status === "clean" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-success-bg/40 px-2 py-0.5 text-[11px] font-bold text-success-text border border-success-border">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Clean
                          </span>
                        ) : analysisResult.scan_status === "infected" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-error-bg/40 px-2 py-0.5 text-[11px] font-bold text-error-text border border-error-border">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Infected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-warning-bg/40 px-2 py-0.5 text-[11px] font-bold text-warning-text border border-warning-border">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Scan Daemon Standby
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {analysisResult.scan_details}
                      </p>
                      <div className="rounded bg-bg-0 p-2 font-mono text-[10px] text-text-muted border border-border break-all">
                        SHA-256: {analysisResult.sha256}
                      </div>
                    </div>

                    {/* OCR Text Stream Preview */}
                    <div className="rounded-xl border border-border bg-bg-1 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                          Extracted Text Preview
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {analysisResult.extracted_text_preview ? `${analysisResult.extracted_text_preview.length} chars` : "0 chars"}
                        </span>
                      </div>
                      <div className="h-40 overflow-y-auto rounded-lg border border-border bg-bg-0 p-3 font-mono text-[11px] leading-relaxed text-text-body whitespace-pre-wrap">
                        {analysisResult.extracted_text_preview || "No text detected directly in document streams."}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: AICTE Scrutiny Mapping & Confirmation */}
                  <div className="rounded-xl border border-border bg-bg-1 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Statutory Scrutiny Candidate Fields
                      </h4>
                      <span className="text-[11px] font-bold text-accent-strong">
                        Preliminary Match
                      </span>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                          Detected Issuing Authority
                        </label>
                        <p className="font-semibold text-text-heading bg-bg-0 p-2 rounded border border-border">
                          {analysisResult.candidate_fields?.issuing_authority || "Authority pattern not matched"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                            Issue Date
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
                          {MANDATORY_AICTE_CHECKLIST.map((item) => (
                            <option key={item.key} value={item.key}>
                              {item.key} ({item.category})
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
        ) : mode === "vault" ? (
          /* REAL-WORLD INSTITUTIONAL DOCUMENT VAULT WORKSPACE */
          <div className="space-y-6">
            {/* 1. AICTE Mandatory Document Checklist Completeness Tracker */}
            <div className="rounded-xl border border-border bg-bg-1 p-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent-strong" />
                    <h3 className="text-sm font-bold text-text-heading">
                      AICTE Statutory Scrutiny Readiness Audit
                    </h3>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Evaluates deposited vault certificates against Chapter 1 & 2 mandatory AICTE APH requirements.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-base font-extrabold text-text-heading">
                      {vaultChecklistStatus.depositedCount} / {MANDATORY_AICTE_CHECKLIST.length}
                    </span>
                    <span className="text-xs text-text-muted block">Clearances Deposited</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAutoPopulateFormFromVault}
                    disabled={vaultChecklistStatus.depositedCount === 0}
                    leftIcon={<ShieldCheck className="h-4 w-4" />}
                  >
                    Auto-Fill Scrutiny Form
                  </Button>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-bg-2 rounded-full h-2.5 overflow-hidden border border-border">
                <div
                  className="bg-accent-strong h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${vaultChecklistStatus.percentage}%` }}
                />
              </div>

              {/* Requirement Chips */}
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 pt-1">
                {vaultChecklistStatus.items.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-lg border p-2.5 text-xs flex items-center justify-between gap-2 transition ${
                      item.deposited
                        ? item.isExpired
                          ? "border-error-border bg-error-bg/30 text-text-heading"
                          : item.isExpiringSoon
                          ? "border-warning-border bg-warning-bg/30 text-text-heading"
                          : "border-success-border bg-success-bg/25 text-text-heading"
                        : "border-border bg-bg-0 text-text-muted"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-bold truncate text-[11px]">{item.label}</p>
                      <p className="text-[10px] text-text-secondary">
                        {item.deposited
                          ? item.isExpired
                            ? "Expired — Needs Renewal"
                            : item.isExpiringSoon
                            ? "Expiring Soon (<60d)"
                            : item.isPermanent
                            ? "Permanent Clear"
                            : `Valid (${item.expiry})`
                          : "Missing from Vault"}
                      </p>
                    </div>
                    {item.deposited ? (
                      item.isExpired ? (
                        <AlertCircle className="h-4 w-4 text-error-text shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-success-text shrink-0" />
                      )
                    ) : (
                      <span className="text-[10px] font-bold text-text-muted px-1.5 py-0.5 rounded bg-bg-2">
                        Missing
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Controls Bar: Search, Category & Expiry Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8.5 rounded-lg border border-border bg-bg-0 pl-8 pr-3 text-xs text-text-heading focus:border-accent-strong focus:outline-none w-44 sm:w-56"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-bg-2 p-0.5">
                  {[
                    { id: "all", label: "All" },
                    { id: "safety", label: "Fire & Safety" },
                    { id: "infrastructure", label: "Land & Building" },
                    { id: "approvals", label: "AICTE / Affiliation" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                        categoryFilter === cat.id
                          ? "bg-bg-0 text-text-heading shadow-sm"
                          : "text-text-muted hover:text-text-heading"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Expiry Risk Filter */}
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-bg-0 px-2 text-xs font-semibold text-text-heading focus:border-accent-strong focus:outline-none"
                  aria-label="Filter by expiry status"
                >
                  <option value="all">All Validity Statuses</option>
                  <option value="valid">🟢 Valid & Active</option>
                  <option value="expiring_soon">🟡 Expiring Soon (&lt;60d)</option>
                  <option value="expired">🔴 Expired / Overdue</option>
                  <option value="permanent">🔵 Permanent Records</option>
                </select>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDossierModal(true)}
                  disabled={vaultDocs.length === 0}
                  leftIcon={<Printer className="h-3.5 w-3.5" />}
                >
                  Export Dossier
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadVaultDocuments}
                  disabled={vaultLoading}
                  leftIcon={<RefreshCw className={`h-3 w-3 ${vaultLoading ? "animate-spin" : ""}`} />}
                >
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setMode("upload")}
                  leftIcon={<UploadCloud className="h-3.5 w-3.5" />}
                >
                  Upload New
                </Button>
              </div>
            </div>

            {vaultError && (
              <div className="rounded-lg border border-warning-border bg-warning-bg/40 p-3 text-xs text-warning-text flex items-center justify-between">
                <span>{vaultError}</span>
                <Button variant="secondary" size="sm" onClick={loadVaultDocuments}>
                  Retry
                </Button>
              </div>
            )}

            {/* 3. Document Cards List */}
            {vaultLoading && vaultDocs.length === 0 ? (
              <div className="rounded-xl border border-border bg-bg-0 p-12 text-center space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-accent-strong mx-auto" />
                <p className="text-xs font-bold text-text-heading">Loading Vault Documents...</p>
              </div>
            ) : vaultDocs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-bg-0 p-12 text-center space-y-4">
                <Archive className="h-10 w-10 text-text-muted mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-text-heading">Institutional Vault is Empty</h4>
                  <p className="text-xs text-text-secondary max-w-sm mx-auto">
                    Deposit statutory clearances like Fire NOC, Land Deeds, and University NOCs to track expiration and automate AICTE scrutiny runs.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => setMode("upload")}>
                  Upload First Statutory PDF
                </Button>
              </div>
            ) : filteredVaultDocs.length === 0 ? (
              <div className="rounded-xl border border-border bg-bg-0 p-8 text-center space-y-2">
                <p className="text-xs text-text-muted font-medium">No documents match your search or filter criteria.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all");
                    setExpiryFilter("all");
                  }}
                  className="text-xs text-accent-strong underline font-bold"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredVaultDocs.map((doc) => {
                  const cf = doc.extracted_metadata?.candidate_fields as Record<string, unknown> | undefined;
                  const expiry = (cf?.expiry_date as string) || doc.custom_expiry_date || "";
                  const authority = (cf?.issuing_authority as string) || doc.issuing_authority || "";
                  const certNo = (cf?.certificate_number as string) || doc.certificate_number || "";
                  const scrutinyStatus = doc.scrutiny_status || "pending";

                  const today = new Date().toISOString().split("T")[0];
                  let isExpired = false;
                  let isExpiringSoon = false;
                  if (expiry) {
                    const diffDays = Math.ceil((new Date(expiry).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24));
                    if (diffDays <= 0) isExpired = true;
                    else if (diffDays <= 60) isExpiringSoon = true;
                  }

                  return (
                    <div
                      key={doc.id}
                      className="rounded-xl border border-border bg-bg-1 p-4.5 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between transition hover:border-border-focus hover:shadow-sm"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <FileText className="h-4.5 w-4.5 text-accent-strong shrink-0" />
                          <span className="font-bold text-sm text-text-heading truncate max-w-[240px] sm:max-w-[320px]">
                            {doc.filename}
                          </span>
                          <span className="rounded bg-bg-2 px-2 py-0.5 text-[10px] font-bold text-text-muted border border-border">
                            {doc.document_type}
                          </span>

                          {/* Scrutiny Verification Status Badge */}
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                              scrutinyStatus === "verified"
                                ? "bg-success-bg/30 text-success-text border-success-border"
                                : scrutinyStatus === "needs_renewal"
                                ? "bg-warning-bg/30 text-warning-text border-warning-border"
                                : scrutinyStatus === "flagged"
                                ? "bg-error-bg/30 text-error-text border-error-border"
                                : "bg-bg-2 text-text-muted border-border"
                            }`}
                          >
                            {scrutinyStatus === "verified"
                              ? "Audited & Verified"
                              : scrutinyStatus === "needs_renewal"
                              ? "Needs Renewal"
                              : scrutinyStatus === "flagged"
                              ? "Clarification Flagged"
                              : "Pending Scrutiny"}
                          </span>

                          {/* Expiry Risk Badge */}
                          {expiry ? (
                            isExpired ? (
                              <span className="rounded bg-error-bg/40 text-error-text px-2 py-0.5 text-[10px] font-bold border border-error-border">
                                Expired: {expiry}
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="rounded bg-warning-bg/40 text-warning-text px-2 py-0.5 text-[10px] font-bold border border-warning-border">
                                Expiring Soon: {expiry}
                              </span>
                            ) : (
                              <span className="rounded bg-success-bg/40 text-success-text px-2 py-0.5 text-[10px] font-bold border border-success-border">
                                Valid: {expiry}
                              </span>
                            )
                          ) : (
                            <span className="rounded bg-bg-2 text-text-muted px-2 py-0.5 text-[10px] font-bold border border-border">
                              Permanent Title / No Expiry
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-secondary">
                          <span>Size: {(doc.filesize_bytes / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>Deposited: {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "—"}</span>
                          {authority && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[180px]">Auth: {authority}</span>
                            </>
                          )}
                          {certNo && (
                            <>
                              <span>•</span>
                              <span className="font-mono">Ref: {certNo}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenInspect(doc)}
                          leftIcon={<Eye className="h-3.5 w-3.5" />}
                        >
                          Inspect & Edit
                        </Button>

                        {expiry && onPopulateDate && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              onPopulateDate(doc.document_type, expiry);
                              alert(`Populated ${doc.document_type} (${expiry}) into compliance form!`);
                            }}
                          >
                            Use in Form
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={downloadingId === doc.id}
                          onClick={() => handleDownloadDoc(doc)}
                          leftIcon={
                            downloadingId === doc.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )
                          }
                        >
                          Download
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === doc.id}
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="text-error-text hover:bg-error-bg/30"
                          aria-label="Delete document"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. In-App Document Inspection & Metadata Editor Modal */}
            {inspectedDoc && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-bg-1 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Archive className="h-5 w-5 text-accent-strong shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-text-heading truncate">
                          {inspectedDoc.filename}
                        </h4>
                        <p className="text-[11px] text-text-muted">
                          {inspectedDoc.document_type} • Ref ID: {inspectedDoc.id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedDoc(null)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-2 hover:text-text-heading transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Mode Toggle: View Details vs Edit Details */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      {isEditingMetadata ? "Correct / Edit Metadata Details" : "Extracted Certificate Details"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-strong hover:underline"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{isEditingMetadata ? "Cancel Editing" : "Edit Metadata"}</span>
                    </button>
                  </div>

                  {isEditingMetadata ? (
                    /* Metadata Edit Form */
                    <div className="space-y-4 rounded-xl border border-border bg-bg-0 p-4 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                          Issuing Authority
                        </label>
                        <input
                          type="text"
                          value={editAuthority}
                          onChange={(e) => setEditAuthority(e.target.value)}
                          placeholder="e.g. State Directorate of Fire and Emergency Services"
                          className="w-full rounded border border-border bg-bg-1 p-2 text-text-heading focus:border-accent-strong focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                            Certificate / NOC Reference Number
                          </label>
                          <input
                            type="text"
                            value={editCertNo}
                            onChange={(e) => setEditCertNo(e.target.value)}
                            placeholder="e.g. NOC-2024-9912"
                            className="w-full rounded border border-border bg-bg-1 p-2 font-mono text-text-heading focus:border-accent-strong focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                            Validity Expiry Date (YYYY-MM-DD)
                          </label>
                          <input
                            type="date"
                            value={editExpiryDate}
                            onChange={(e) => setEditExpiryDate(e.target.value)}
                            className="w-full rounded border border-border bg-bg-1 p-2 font-mono font-bold text-accent-strong focus:border-accent-strong focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                          Institutional Scrutiny Status
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full rounded border border-border bg-bg-1 p-2 text-text-heading focus:border-accent-strong focus:outline-none font-semibold"
                        >
                          <option value="pending">Pending Scrutiny Review</option>
                          <option value="needs_renewal">Needs Renewal / Approaching Expiry</option>
                          <option value="flagged">Flagged for Clarification</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingMetadata(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isSavingEdit}
                          onClick={handleSaveMetadataChanges}
                          leftIcon={isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        >
                          {isSavingEdit ? "Saving..." : "Save Corrections"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Metadata View Grid */
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="rounded-lg border border-border bg-bg-0 p-3 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-text-muted block">Security & Scanner</span>
                        <p className={`font-bold flex items-center gap-1.5 ${
                          inspectedDoc.scan_status === "clean" ? "text-success-text" : "text-warning-text"
                        }`}>
                          {inspectedDoc.scan_status === "clean" ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          <span>{inspectedDoc.scan_status === "clean" ? "Malware scan passed" : inspectedDoc.scan_status === "infected" ? "Malware detected" : "Malware scan unavailable; download blocked"}</span>
                        </p>
                        <p className="text-[10px] text-text-secondary mt-1">{inspectedDoc.scan_details || "No trusted malware scan result is available."}</p>
                      </div>

                      <div className="rounded-lg border border-border bg-bg-0 p-3 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-text-muted block">Regulatory Scope</span>
                        <p className="font-bold text-text-heading">{inspectedDoc.document_type}</p>
                        <p className="text-[10px] text-text-secondary">
                          Deposited: {new Date(inspectedDoc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* OCR Text Stream Preview */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                      Extracted Text Stream & OCR Preview
                    </span>
                    <div className="h-36 overflow-y-auto rounded-lg border border-border bg-bg-0 p-3 font-mono text-[11px] leading-relaxed text-text-body whitespace-pre-wrap">
                      {(inspectedDoc.extracted_metadata?.extracted_text_preview as string) ||
                        (inspectedDoc.extracted_metadata?.extracted_text as string) ||
                        "No text was extracted from this document."}
                    </div>
                  </div>

                  {/* Cryptographic SHA-256 */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                      SHA-256 Cryptographic Checksum
                    </span>
                    <p className="font-mono text-[10px] text-text-muted bg-bg-0 p-2.5 rounded-lg border border-border break-all">
                      {inspectedDoc.sha256}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                    <Button variant="secondary" size="sm" onClick={() => setInspectedDoc(null)}>
                      Close Preview
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleDownloadDoc(inspectedDoc)}
                      leftIcon={<Download className="h-3.5 w-3.5" />}
                    >
                      Download Original PDF
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Institutional Scrutiny Dossier Modal */}
            {showDossierModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
                <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-bg-1 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-6 w-6 text-accent-strong shrink-0" />
                      <div>
                        <h3 className="text-base font-extrabold text-text-heading">
                          AICTE Institutional Compliance Dossier
                        </h3>
                        <p className="text-xs text-text-secondary">
                          Official Regulatory Clearance Summary for AICTE Scrutiny Committee & EVC
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDossierModal(false)}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-bg-2 hover:text-text-heading transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Institution Details Header */}
                  <div className="rounded-xl border border-border bg-bg-0 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-text-muted block">Institution Code</span>
                      <p className="font-mono font-bold text-text-heading">{institutionCode}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-text-muted block">Applicant Name</span>
                      <p className="font-semibold text-text-heading">{institutionName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-text-muted block">Scrutiny Scope</span>
                      <p className="font-semibold text-accent-strong">EoA 2026-27 Approval</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-text-muted block">Readiness Meter</span>
                      <p className="font-bold text-success-text">
                        {vaultChecklistStatus.depositedCount} / {MANDATORY_AICTE_CHECKLIST.length} ({vaultChecklistStatus.percentage}%)
                      </p>
                    </div>
                  </div>

                  {/* Clearances Table */}
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-bg-2 text-text-heading font-bold">
                        <tr>
                          <th className="p-2.5">Mandatory Clearances</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Validity Date</th>
                          <th className="p-2.5">Authority / Ref</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-bg-0">
                        {vaultChecklistStatus.items.map((item) => {
                          const doc = item.document;
                          const cf = doc?.extracted_metadata?.candidate_fields as Record<string, unknown> | undefined;
                          const auth = (cf?.issuing_authority as string) || doc?.issuing_authority || "—";
                          const cert = (cf?.certificate_number as string) || doc?.certificate_number || "";

                          return (
                            <tr key={item.key} className="hover:bg-bg-1/50 transition">
                              <td className="p-2.5">
                                <p className="font-bold text-text-heading">{item.label}</p>
                                <p className="text-[10px] text-text-muted">{item.category}</p>
                              </td>
                              <td className="p-2.5">
                                {item.deposited ? (
                                  item.isExpired ? (
                                    <span className="rounded bg-error-bg/40 text-error-text px-1.5 py-0.5 text-[10px] font-bold">
                                      Expired
                                    </span>
                                  ) : item.isExpiringSoon ? (
                                    <span className="rounded bg-warning-bg/40 text-warning-text px-1.5 py-0.5 text-[10px] font-bold">
                                      Expiring Soon
                                    </span>
                                  ) : (
                                    <span className="rounded bg-success-bg/40 text-success-text px-1.5 py-0.5 text-[10px] font-bold">
                                      Deposited & Valid
                                    </span>
                                  )
                                ) : (
                                  <span className="rounded bg-bg-2 text-text-muted px-1.5 py-0.5 text-[10px] font-bold">
                                    Missing
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-mono">
                                {item.isPermanent ? "Permanent Record" : item.expiry || "—"}
                              </td>
                              <td className="p-2.5 text-text-secondary">
                                <p className="truncate max-w-[200px]">{auth}</p>
                                {cert && <p className="font-mono text-[10px] text-text-muted">Ref: {cert}</p>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <p className="text-[11px] text-text-muted italic">
                      Dossier compiled from cryptographic SHA-256 records in institutional vault.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setShowDossierModal(false)}>
                        Close
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => window.print()}
                        leftIcon={<Printer className="h-3.5 w-3.5" />}
                      >
                        Print Dossier
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* SAMPLE BENCHMARK SPECIMENS */
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-bg-2 p-3 text-xs text-text-secondary flex items-center justify-between">
              <span>
                <strong>Benchmark Reference Specimens:</strong> These samples demonstrate expected OCR metadata patterns and digital signature structures. They do not alter your institution's live scrutiny score.
              </span>
            </div>

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
