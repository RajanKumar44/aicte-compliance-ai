/**
 * AICTE Approval Process Handbook (APH 2024–2027) Regulatory Knowledge & Clause Reference.
 * 
 * Provides official clause citations, statutory document metadata, mitigation undertakings,
 * and Cadre/FSR calculation formulas based on the Council's published norms.
 */

export interface APHClauseReference {
  clause: string;
  chapter: string;
  title: string;
  requirement: string;
  deficiencyImpact: string;
  mitigationUndertaking: string;
  isStatutoryZeroTolerance: boolean;
}

export const APH_CLAUSE_CATALOG: Record<string, APHClauseReference> = {
  "Fire Safety Certificate": {
    clause: "Clause 2.4",
    chapter: "Chapter II: Extension of Approval",
    title: "Fire and Life Safety Clearance",
    requirement: "Valid Fire Safety NOC issued by the Competent State Fire Authority for all instructional and administrative blocks.",
    deficiencyImpact: "Zero-tolerance deficiency. Mandates withholding of EoA and summons before the Standing Hearing Committee (SHC).",
    mitigationUndertaking: "AICTE Format 3 Undertaking on Rs. 100 non-judicial stamp paper accompanied by the official renewal application receipt challan from the District Fire Officer.",
    isStatutoryZeroTolerance: true,
  },
  "Building Structural Stability Certificate": {
    clause: "Clause 2.6",
    chapter: "Chapter II: Infrastructure Verification",
    title: "Structural Soundness Certification",
    requirement: "Certificate issued by a Government-registered Structural Engineer confirming the building's earthquake and structural resistance.",
    deficiencyImpact: "Severe deficiency. Results in immediate halt of intake increase and mandatory physical inspection by an Expert Visit Committee (EVC).",
    mitigationUndertaking: "Provisional structural inspection affidavit by an empaneled engineer stating inspection is complete and official report submission is pending municipal seal.",
    isStatutoryZeroTolerance: true,
  },
  "Occupancy Certificate": {
    clause: "Clause 2.5",
    chapter: "Chapter II: Land & Building Norms",
    title: "Building Occupancy & Completion Certificate",
    requirement: "Final or provisional Occupancy Certificate from the Municipal Corporation / Competent Town Planning Authority.",
    deficiencyImpact: "Rejection of new programs or campus expansion. May lead to reduction in approved seat matrix.",
    mitigationUndertaking: "Submission of Building Blueprint certified by an architect along with local body application registration number.",
    isStatutoryZeroTolerance: true,
  },
  "Land Ownership Deed / 30-Year Registered Lease": {
    clause: "Clause 1.7",
    chapter: "Chapter I: Establishment of New Technical Institutions",
    title: "Contiguous Land Title & NA Conversion",
    requirement: "Clear, unencumbered land ownership or minimum 30-year registered lease deed with official Non-Agricultural (NA) educational conversion order.",
    deficiencyImpact: "Total disqualification of establishment/continuation. Division of campus across non-permitted separation distance.",
    mitigationUndertaking: "Certified copy of registered sub-registrar entry plus mutation extract confirming lawful title and physical possession.",
    isStatutoryZeroTolerance: true,
  },
  "State Pollution Control Board NOC": {
    clause: "Clause 1.8",
    chapter: "Chapter I & II: Environmental Clearances",
    title: "Consent to Operate / Water & Air NOC",
    requirement: "Consent to Operate / Certificate of Sewage and Effluent Treatment from the State Pollution Control Board.",
    deficiencyImpact: "Deficiency notice with 15-day rectification window before Regional Committee review.",
    mitigationUndertaking: "Formal copy of renewal application with verification fee challan submitted to the regional SPCB officer.",
    isStatutoryZeroTolerance: false,
  },
  "NBA Accreditation Certificate": {
    clause: "Clause 4.2",
    chapter: "Chapter IV: Intake Expansion & New Courses",
    title: "Programmatic Accreditation Norms",
    requirement: "Minimum valid NBA accreditation for at least 50% eligible courses for existing institutions seeking intake expansion.",
    deficiencyImpact: "Automatic denial of additional division or new specialization. Reversion to base intake.",
    mitigationUndertaking: "Pre-qualifier acceptance letter or NBA peer-visit scheduling acknowledgment receipt.",
    isStatutoryZeroTolerance: false,
  },
  "Affidavit 1 & Affidavit 2 (AICTE Portal Format)": {
    clause: "Clause 2.1",
    chapter: "Chapter II: Annual Self-Disclosure",
    title: "Mandatory Statutory Self-Disclosure Affidavits",
    requirement: "Duly notarized Affidavits 1 and 2 confirming accurate disclosure of faculty roster, fees, anti-ragging, and infrastructure.",
    deficiencyImpact: "Incomplete application. Rejection at online scrutinizer gate prior to committee review.",
    mitigationUndertaking: "Immediate digital re-upload with valid notary seal and stamp.",
    isStatutoryZeroTolerance: true,
  },
  "Fixed Deposit (Corpus Fund) Receipt": {
    clause: "Clause 1.9",
    chapter: "Chapter I: Financial Solvency",
    title: "Joint Corpus Security Deposit",
    requirement: "FDR in the joint name of Sponsoring Trust / Society and Regional Officer, AICTE for the prescribed lock-in period.",
    deficiencyImpact: "Withholding of Letter of Approval (LoA) or Letter of Extension (LoE).",
    mitigationUndertaking: "Banker's solvency certificate along with letter of lien creation submitted to AICTE Regional Office.",
    isStatutoryZeroTolerance: true,
  },
};

export interface CadreNorms {
  program: string;
  standardFSR: number; // e.g. 15 or 20
  professorRatio: number; // 1
  assocProfRatio: number; // 2
  asstProfRatio: number; // 6
  phdRequirement: {
    professor: number; // 100%
    assocProf: number; // 100%
    asstProf: number; // Optional/encouraged
  };
}

export const CADRE_PROGRAM_NORMS: Record<string, CadreNorms> = {
  "engineering_ug": {
    program: "Engineering & Technology (UG - B.Tech / B.E.)",
    standardFSR: 20, // AICTE Tier 2 default, Tier 1 is 15
    professorRatio: 1,
    assocProfRatio: 2,
    asstProfRatio: 6,
    phdRequirement: { professor: 1.0, assocProf: 1.0, asstProf: 0.2 },
  },
  "management_pg": {
    program: "Management (MBA / PGDM)",
    standardFSR: 20,
    professorRatio: 1,
    assocProfRatio: 2,
    asstProfRatio: 6,
    phdRequirement: { professor: 1.0, assocProf: 1.0, asstProf: 0.1 },
  },
  "mca_pg": {
    program: "Computer Applications (MCA)",
    standardFSR: 20,
    professorRatio: 1,
    assocProfRatio: 2,
    asstProfRatio: 6,
    phdRequirement: { professor: 1.0, assocProf: 1.0, asstProf: 0.1 },
  },
  "polytechnic_diploma": {
    program: "Diploma in Engineering & Technology",
    standardFSR: 25,
    professorRatio: 1,
    assocProfRatio: 2,
    asstProfRatio: 6,
    phdRequirement: { professor: 0.5, assocProf: 0.2, asstProf: 0.0 },
  },
};

export interface ReadinessScoreResult {
  score: number; // 0 to 100
  tier: "ready_nil_deficiency" | "conditional_minor_hearing" | "critical_deficiency_risk";
  label: string;
  summary: string;
  totalRequired: number;
  submittedCount: number;
  missingCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  criticalZeroToleranceCount: number;
  findings: Array<{
    document: string;
    type: "missing" | "expired" | "expiring_soon";
    clause?: APHClauseReference;
    impact: string;
    suggestedAction: string;
  }>;
}

export function computeReadinessScore(
  required: string[],
  submitted: string[],
  expiryDates: Record<string, string>,
  today: Date = new Date()
): ReadinessScoreResult {
  const reqSet = new Set(required);
  const subSet = new Set(submitted);

  const missing = required.filter((doc) => !subSet.has(doc));
  const findings: ReadinessScoreResult["findings"] = [];

  let expiredCount = 0;
  let expiringSoonCount = 0;
  let criticalCount = 0;

  // Process missing
  for (const doc of missing) {
    const clause = APH_CLAUSE_CATALOG[doc];
    const isZeroTol = clause?.isStatutoryZeroTolerance ?? false;
    if (isZeroTol) criticalCount++;

    findings.push({
      document: doc,
      type: "missing",
      clause,
      impact: clause ? clause.deficiencyImpact : "Application checklist deficiency noted.",
      suggestedAction: clause ? clause.mitigationUndertaking : "Upload document before Scrutiny Committee cutoff.",
    });
  }

  // Process submitted for expiry
  for (const doc of submitted) {
    const expStr = expiryDates[doc];
    if (!expStr) continue;

    const expDate = new Date(expStr);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const clause = APH_CLAUSE_CATALOG[doc];
    const isZeroTol = clause?.isStatutoryZeroTolerance ?? false;

    if (diffDays < 0) {
      expiredCount++;
      if (isZeroTol) criticalCount++;
      findings.push({
        document: doc,
        type: "expired",
        clause,
        impact: clause ? clause.deficiencyImpact : `Document expired ${Math.abs(diffDays)} days ago.`,
        suggestedAction: clause ? clause.mitigationUndertaking : "Obtain immediate official renewal acknowledgment.",
      });
    } else if (diffDays <= 60) {
      expiringSoonCount++;
      findings.push({
        document: doc,
        type: "expiring_soon",
        clause,
        impact: `Document expires in ${diffDays} days (during active APH academic scrutiny window).`,
        suggestedAction: "Initiate renewal requisition to avoid gap during unannounced EVC surprise audit.",
      });
    }
  }

  // Base score calculation
  const total = required.length || 1;
  const validSubmitted = Math.max(0, submitted.filter((d) => reqSet.has(d)).length - expiredCount);
  let rawScore = Math.round((validSubmitted / total) * 100);

  // Penalize for critical zero tolerance & expiring items
  rawScore -= criticalCount * 18;
  rawScore -= expiringSoonCount * 5;
  rawScore = Math.max(0, Math.min(100, rawScore));

  let tier: ReadinessScoreResult["tier"] = "critical_deficiency_risk";
  let label = "High Risk of Deficiency Report & SHC Summons";
  let summary = "Mandatory statutory documents are missing or expired. High likelihood of approval withholding.";

  if (rawScore >= 95 && criticalCount === 0 && expiredCount === 0) {
    tier = "ready_nil_deficiency";
    label = "Ready for Nil-Deficiency Approval";
    summary = "Checklist fulfills APH 2024–2027 statutory criteria with zero immediate deficiencies flagged.";
  } else if (rawScore >= 65) {
    tier = "conditional_minor_hearing";
    label = "Conditional / Minor Rectification Required";
    summary = "Meets primary criteria but requires procedural affidavits or renewal undertakings prior to scrutiny hearing.";
  }

  return {
    score: rawScore,
    tier,
    label,
    summary,
    totalRequired: required.length,
    submittedCount: submitted.length,
    missingCount: missing.length,
    expiredCount,
    expiringSoonCount,
    criticalZeroToleranceCount: criticalCount,
    findings,
  };
}
