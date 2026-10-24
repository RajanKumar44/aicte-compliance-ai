import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, CalendarClock, Check, CheckCircle2, ChevronDown, FileCheck2, FileText, Loader2, RefreshCw, ScanSearch, Send, ShieldCheck, UploadCloud, X } from "lucide-react";
import { validateDocuments, type ApplicationType, type ValidationRequest, type ValidationResponse } from "@/lib/api";
import { ValidationResults } from "@/components/ValidationResults";
import { Badge } from "@/components/Badge";

const previewChecklist = ["approval_letter", "land_ownership_document", "faculty_undertaking", "fire_safety_certificate"];
type PageState = "form" | "loading" | "success" | "error";
type UploadItem = { name: string; progress: number; status: "uploading" | "ready" };

function prettyName(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TagField({ label, value, onChange, placeholder, tone = "neutral" }: { label: string; value: string[]; onChange: (next: string[]) => void; placeholder: string; tone?: "neutral" | "green" }) {
  const [input, setInput] = useState("");
  function add(raw: string) {
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, "_");
    if (normalized && !value.includes(normalized)) onChange([...value, normalized]);
    setInput("");
  }
  return <div>
    <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</label>
    <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900">
      {value.map((item) => <span key={item} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${tone === "green" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{prettyName(item)}<button type="button" onClick={() => onChange(value.filter((entry) => entry !== item))} className="text-current/50 hover:text-rose-600" aria-label={`Remove ${prettyName(item)}`}><X className="h-3 w-3" /></button></span>)}
      <input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); add(input); } }} onBlur={() => input && add(input)} className="min-w-[150px] flex-1 bg-transparent py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" placeholder={value.length ? "Add another document" : placeholder} aria-label={label} />
    </div>
    <p className="mt-1.5 text-[11px] text-slate-400">Press Enter to add a document.</p>
  </div>;
}

export function ValidatePage() {
  const [institutionId, setInstitutionId] = useState("");
  const [applicationType, setApplicationType] = useState<ApplicationType>("eoa");
  const [approvalYear, setApprovalYear] = useState("2025");
  const [requiredDocs, setRequiredDocs] = useState<string[]>(previewChecklist);
  const [submittedDocs, setSubmittedDocs] = useState<string[]>(["approval_letter", "land_ownership_document"]);
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pageState, setPageState] = useState<PageState>("form");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = pageState === "loading";

  function addFiles(files: FileList | File[]) {
    const next = Array.from(files).map((file) => ({ name: file.name, progress: 0, status: "uploading" as const }));
    setUploads((current) => [...current, ...next]);
    next.forEach((file) => {
      const normalized = file.name.replace(/\.[^/.]+$/, "").trim().toLowerCase().replace(/\s+/g, "_");
      setSubmittedDocs((current) => current.includes(normalized) ? current : [...current, normalized]);
      let progress = 0;
      const timer = window.setInterval(() => {
        progress += 25;
        setUploads((current) => current.map((item) => item.name === file.name ? { ...item, progress, status: progress >= 100 ? "ready" : "uploading" } : item));
        if (progress >= 100) window.clearInterval(timer);
      }, 180);
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!isLoading) addFiles(event.dataTransfer.files);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setServerError("");
    if (!institutionId.trim()) { setFieldErrors({ institution_id: "Institution ID is required." }); return; }
    if (!requiredDocs.length) { setFieldErrors({ required_documents: "Add at least one required document." }); return; }
    setPageState("loading");
    const request: ValidationRequest = { institution_id: institutionId.trim(), application_type: applicationType, required_documents: requiredDocs, submitted_documents: submittedDocs, expiry_dates: Object.fromEntries(Object.entries(expiryDates).filter(([, value]) => value)) };
    const response = await validateDocuments(request);
    if (response.ok) { setResult(response.data); setPageState("success"); }
    else if (response.kind === "validation") { setFieldErrors(response.errors); setPageState("form"); }
    else { setServerError(response.errors._network || response.errors._server || `Server error (${response.status})`); setPageState("error"); }
  }

  function reset() {
    setInstitutionId("");
    setRequiredDocs(previewChecklist);
    setSubmittedDocs(["approval_letter", "land_ownership_document"]);
    setExpiryDates({});
    setUploads([]);
    setResult(null);
    setFieldErrors({});
    setServerError("");
    setPageState("form");
  }

  if (pageState === "success" && result) return <ValidationResults data={result} onReset={reset} />;
  if (pageState === "error") return <div className="mx-auto max-w-3xl space-y-6"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-600">Verification interrupted</p><h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">The validation service is unavailable.</h1><p className="mt-2 text-sm text-slate-500">Your workspace values are still here. Retry when the API is reachable.</p></div><div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"><div className="flex gap-3"><AlertCircle className="h-5 w-5 shrink-0" />{serverError}</div></div><div className="flex gap-3"><button type="button" onClick={() => setPageState("form")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><RefreshCw className="h-4 w-4" />Retry</button><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><ArrowLeft className="h-4 w-4" />Start over</button></div></div>;

  return <div className="mx-auto max-w-[1480px] space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Verification workspace</div><h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Compare evidence with confidence.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Set the review context, add the required checklist, and inspect preliminary matches before human review.</p></div><Badge variant="neutral"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Preliminary mode</Badge></div>
    <form onSubmit={handleSubmit} aria-busy={isLoading} className="space-y-5">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-emerald-300"><ShieldCheck className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold text-slate-950 dark:text-white">Input context</h2><p className="text-xs text-slate-500">Identify the institution and review cycle.</p></div></div><div className="grid gap-4 md:grid-cols-[1.2fr_1fr_0.8fr]"><label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Institution ID<input value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} className="mt-2 block h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" placeholder="e.g. SYNTH-INST-001" aria-invalid={!!fieldErrors.institution_id} />{fieldErrors.institution_id && <span className="mt-1 block text-xs text-rose-600">{fieldErrors.institution_id}</span>}</label><label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Application type<div className="relative mt-2"><select value={applicationType} onChange={(event) => setApplicationType(event.target.value as ApplicationType)} className="block h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="eoa">Extension of Approval (EOA)</option><option value="new_program">New Program</option><option value="intake_change">Intake Change</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" /></div></label><label className="text-xs font-semibold text-slate-700 dark:text-slate-200">AICTE approval year<input type="number" min="2000" max="2100" value={approvalYear} onChange={(event) => setApprovalYear(event.target.value)} className="mt-2 block h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label></div></section>
      <section className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-400/10" : "border-slate-300 bg-white hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-950"}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}><input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="sr-only" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} /><button type="button" onClick={() => inputRef.current?.click()} className="mx-auto flex flex-col items-center"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${dragging ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}><UploadCloud className="h-6 w-6" /></span><span className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Drop institution documents here</span><span className="mt-1 text-xs text-slate-500">or browse files. PDF, DOCX, PNG and JPG supported.</span></button>{uploads.length > 0 && <div className="mx-auto mt-5 grid max-w-2xl gap-2 text-left sm:grid-cols-2">{uploads.map((file) => <div key={file.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-600" /><span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">{file.name}</span>{file.status === "ready" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}</div><div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-500 transition-all duration-200" style={{ width: `${file.progress}%` }} /></div></div>)}</div>}<p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-slate-400">Files become submitted-document labels in this preliminary prototype.</p></section>
      <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><div className="flex items-center gap-2"><ScanSearch className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-950 dark:text-white">Required AICTE checklist</h2></div><p className="mt-1 text-xs text-slate-500">Mandatory documents for this review context.</p></div><span className="font-mono text-xs text-slate-400">{requiredDocs.length.toString().padStart(2, "0")} items</span></div><TagField label="Checklist items" value={requiredDocs} onChange={setRequiredDocs} placeholder="Add required document" />{fieldErrors.required_documents && <p className="mt-2 text-xs text-rose-600">{fieldErrors.required_documents}</p>}<div className="mt-6 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">{(requiredDocs.length ? requiredDocs : previewChecklist).map((doc) => <div key={doc} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${submittedDocs.includes(doc) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" : "bg-rose-100 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300"}`}>{submittedDocs.includes(doc) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}</span><span className="text-xs font-medium text-slate-700 dark:text-slate-300">{prettyName(doc)}</span><span className="ml-auto text-[10px] text-slate-400">{submittedDocs.includes(doc) ? "Matched" : "Missing"}</span></div>)}</div></section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><div className="flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-emerald-600" /><h2 className="text-sm font-semibold text-slate-950 dark:text-white">Submitted evidence & findings</h2></div><p className="mt-1 text-xs text-slate-500">Map supplied evidence to the checklist.</p></div><Badge variant="info">Live mapping</Badge></div><TagField label="Submitted documents" value={submittedDocs} onChange={setSubmittedDocs} placeholder="Add submitted document" tone="green" /><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Match coverage</p><p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{requiredDocs.length ? Math.round((requiredDocs.filter((doc) => submittedDocs.includes(doc)).length / requiredDocs.length) * 100) : 0}%</p><p className="mt-1 text-xs text-slate-500">Based on supplied names</p></div><div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">OCR confidence</p><p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">--</p><p className="mt-1 text-xs text-slate-500">No OCR file processing yet</p></div></div><div className="mt-3 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200"><div className="flex gap-2"><CalendarClock className="h-4 w-4 shrink-0" /><span>Add expiry dates below to surface date observations for human review.</span></div></div></section></div>
      {submittedDocs.length > 0 && <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"><div className="mb-4 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-amber-600" /><h2 className="text-sm font-semibold text-slate-950 dark:text-white">Expiry observations <span className="font-normal text-slate-400">optional</span></h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{submittedDocs.slice(0, 4).map((doc) => <label key={doc} className="text-xs text-slate-500">{prettyName(doc)}<input type="date" value={expiryDates[doc] || ""} onChange={(event) => setExpiryDates({ ...expiryDates, [doc]: event.target.value })} className="mt-2 block h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" /></label>)}</div></section>}
      <div className="flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" />Results are advisory and require human review.</div><div className="flex gap-3"><button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Reset</button><button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/15 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{isLoading ? "Running verification" : "Run preliminary verification"}</button></div></div>
    </form>
  </div>;
}
