import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import {
  Users,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from "lucide-react";

interface DepartmentPreset {
  name: string;
  programKey: string;
  intake: number;
  duration: number;
  fsrRatio: number;
  professors: number;
  professorsPhd: number;
  assocProfs: number;
  assocProfsPhd: number;
  asstProfs: number;
  description: string;
}

const PRESETS: DepartmentPreset[] = [
  {
    name: "Common Deficient Engineering Dept (360 Seats)",
    programKey: "engineering_ug",
    intake: 120, // 120 annual * 4 yrs = 480 students
    duration: 4,
    fsrRatio: 20,
    professors: 0, // Typical private college has 0 professors
    professorsPhd: 0,
    assocProfs: 2,
    assocProfsPhd: 1,
    asstProfs: 18,
    description: "Typical private engineering department with zero Professors and junior-heavy Assistant Professor cadre.",
  },
  {
    name: "Compliant Tier-1 Engineering Dept (1:15)",
    programKey: "engineering_ug",
    intake: 120,
    duration: 4,
    fsrRatio: 15,
    professors: 4,
    professorsPhd: 4,
    assocProfs: 8,
    assocProfsPhd: 8,
    asstProfs: 20,
    description: "Fully compliant NBA-accredited autonomous department fulfilling 1:15 FSR and 1:2:6 cadre ratio.",
  },
  {
    name: "Management Dept (MBA - 120 Seats)",
    programKey: "management_pg",
    intake: 60,
    duration: 2,
    fsrRatio: 20,
    professors: 1,
    professorsPhd: 1,
    assocProfs: 1,
    assocProfsPhd: 1,
    asstProfs: 4,
    description: "2-year MBA department with 120 total student strength adhering to AICTE PG management criteria.",
  },
];

export function CadreCalculatorPage() {
  const [programKey, setProgramKey] = useState<string>("engineering_ug");
  const [annualIntake, setAnnualIntake] = useState<number>(120);
  const [durationYears, setDurationYears] = useState<number>(4);
  const [targetFsr, setTargetFsr] = useState<number>(20);

  // Existing faculty inputs
  const [professors, setProfessors] = useState<number>(0);
  const [professorsPhd, setProfessorsPhd] = useState<number>(0);
  const [assocProfs, setAssocProfs] = useState<number>(2);
  const [assocProfsPhd, setAssocProfsPhd] = useState<number>(1);
  const [asstProfs, setAsstProfs] = useState<number>(18);

  // Computations
  const totalStudents = Math.max(1, annualIntake * durationYears);
  const requiredFaculty = Math.ceil(totalStudents / targetFsr);

  // 1:2:6 ratio calculation (1+2+6 = 9 parts)
  const reqProfessors = Math.max(1, Math.ceil(requiredFaculty * (1 / 9)));
  const reqAssocProfs = Math.max(1, Math.ceil(requiredFaculty * (2 / 9)));
  const reqAsstProfs = Math.max(1, requiredFaculty - (reqProfessors + reqAssocProfs));

  const totalExistingFaculty = professors + assocProfs + asstProfs;
  const currentRatio = totalExistingFaculty > 0 ? (totalStudents / totalExistingFaculty).toFixed(1) : "N/A";

  // Cadre deficits
  const profDeficit = reqProfessors - professors;
  const assocDeficit = reqAssocProfs - assocProfs;
  const asstDeficit = reqAsstProfs - asstProfs;
  const totalDeficit = requiredFaculty - totalExistingFaculty;

  // PhD requirements
  const profPhdMissing = Math.max(0, professors - professorsPhd);
  const assocPhdMissing = Math.max(0, assocProfs - assocProfsPhd);

  const hasAnyDeficiency =
    totalDeficit > 0 ||
    profDeficit > 0 ||
    assocDeficit > 0 ||
    profPhdMissing > 0 ||
    assocPhdMissing > 0;

  const loadPreset = (preset: DepartmentPreset) => {
    setProgramKey(preset.programKey);
    setAnnualIntake(preset.intake);
    setDurationYears(preset.duration);
    setTargetFsr(preset.fsrRatio);
    setProfessors(preset.professors);
    setProfessorsPhd(preset.professorsPhd);
    setAssocProfs(preset.assocProfs);
    setAssocProfsPhd(preset.assocProfsPhd);
    setAsstProfs(preset.asstProfs);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-fade-in">
      {/* Header */}
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-2 px-3.5 py-1 text-xs font-bold text-text-heading">
          <GraduationCap className="h-3.5 w-3.5 text-accent-strong" aria-hidden="true" />
          <span>AICTE APH 2024–2027 Appendix 7 Norms</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-heading sm:text-4xl">
          Faculty-to-Student Ratio (FSR) & Cadre Ratio Calculator
        </h1>
        <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-text-body">
          Over 70% of AICTE deficiency reports arise from non-compliance with the 1:2:6 Cadre Ratio or doctoral degree requirements. Calculate department faculty quotas and avoid faculty deficiency flags prior to Scrutiny Committee evaluation.
        </p>
      </section>

      {/* Quick Scenario Presets */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            <Sparkles className="h-4 w-4 text-accent-strong" />
            <span>Load Department Evaluation Presets</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => loadPreset(p)}
                className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-bg-1 p-3.5 text-left transition-all hover:bg-bg-2 hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span className="font-bold text-xs text-text-heading">{p.name}</span>
                <span className="text-[11px] text-text-secondary leading-snug line-clamp-2">
                  {p.description}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Inputs (Academic Context & Appointed Faculty) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Card: Academic Context */}
        <Card className="border-border">
          <CardHeader className="border-b border-border bg-bg-1 pb-4">
            <CardTitle className="text-base font-bold text-text-heading flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-strong" />
              <span>1. Academic Context</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="program-select">
                Technical Program
              </label>
              <select
                id="program-select"
                value={programKey}
                onChange={(e) => {
                  const k = e.target.value;
                  setProgramKey(k);
                  if (k === "management_pg" || k === "mca_pg") setDurationYears(2);
                  else if (k === "polytechnic_diploma") setDurationYears(3);
                  else setDurationYears(4);
                }}
                className="app-control w-full rounded-md border border-border bg-bg-1 px-3 py-2 text-sm text-text-heading"
              >
                <option value="engineering_ug">Engineering & Technology (UG - B.Tech)</option>
                <option value="management_pg">Management (MBA / PGDM)</option>
                <option value="mca_pg">Computer Applications (MCA)</option>
                <option value="polytechnic_diploma">Polytechnic Diploma in Engg.</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="intake-input">
                  Annual Sanctioned Intake
                </label>
                <input
                  id="intake-input"
                  type="number"
                  min={30}
                  step={30}
                  value={annualIntake}
                  onChange={(e) => setAnnualIntake(Math.max(1, Number(e.target.value)))}
                  className="app-control w-full rounded-md border border-border bg-bg-1 px-3 py-2 text-sm text-text-heading"
                />
                <p className="text-[11px] text-text-muted">Seats per year (e.g. 60, 120, 180)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="duration-input">
                  Duration (Years)
                </label>
                <input
                  id="duration-input"
                  type="number"
                  min={1}
                  max={5}
                  value={durationYears}
                  onChange={(e) => setDurationYears(Math.max(1, Number(e.target.value)))}
                  className="app-control w-full rounded-md border border-border bg-bg-1 px-3 py-2 text-sm text-text-heading"
                />
                <p className="text-[11px] text-text-muted">Total batches in campus</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="fsr-select">
                Target AICTE Ratio (FSR)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetFsr(20)}
                  className={`rounded-md border p-2 text-center text-xs font-bold transition-all ${
                    targetFsr === 20
                      ? "border-primary-500 bg-bg-2 text-text-heading shadow-sm border-2"
                      : "border-border bg-bg-1 text-text-secondary hover:bg-bg-2"
                  }`}
                >
                  1:20 (Standard Tier-2)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetFsr(15)}
                  className={`rounded-md border p-2 text-center text-xs font-bold transition-all ${
                    targetFsr === 15
                      ? "border-primary-500 bg-bg-2 text-text-heading shadow-sm border-2"
                      : "border-border bg-bg-1 text-text-secondary hover:bg-bg-2"
                  }`}
                >
                  1:15 (Accredited Tier-1)
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Card: Current Faculty Intake */}
        <Card className="border-border">
          <CardHeader className="border-b border-border bg-bg-1 pb-4">
            <CardTitle className="text-base font-bold text-text-heading flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-strong" />
              <span>2. Currently Appointed Faculty</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 p-5">
            {/* Professor Input */}
            <div className="rounded-lg border border-border bg-bg-1 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text-heading block">Professors</span>
                  <span className="text-[11px] text-text-muted">Mandatory Ph.D. holder</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={professors}
                  onChange={(e) => {
                    const v = Math.max(0, Number(e.target.value));
                    setProfessors(v);
                    if (professorsPhd > v) setProfessorsPhd(v);
                  }}
                  className="app-control w-20 rounded border border-border bg-bg-0 p-1.5 text-center font-bold text-sm text-text-heading"
                />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-[11px] text-text-secondary">Of which holding Ph.D.:</span>
                <input
                  type="number"
                  min={0}
                  max={professors}
                  value={professorsPhd}
                  onChange={(e) => setProfessorsPhd(Math.min(professors, Math.max(0, Number(e.target.value))))}
                  className="app-control w-20 rounded border border-border bg-bg-0 p-1.5 text-center font-bold text-xs text-text-heading"
                />
              </div>
            </div>

            {/* Associate Professor Input */}
            <div className="rounded-lg border border-border bg-bg-1 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text-heading block">Associate Professors</span>
                  <span className="text-[11px] text-text-muted">Mandatory Ph.D. holder</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={assocProfs}
                  onChange={(e) => {
                    const v = Math.max(0, Number(e.target.value));
                    setAssocProfs(v);
                    if (assocProfsPhd > v) setAssocProfsPhd(v);
                  }}
                  className="app-control w-20 rounded border border-border bg-bg-0 p-1.5 text-center font-bold text-sm text-text-heading"
                />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-[11px] text-text-secondary">Of which holding Ph.D.:</span>
                <input
                  type="number"
                  min={0}
                  max={assocProfs}
                  value={assocProfsPhd}
                  onChange={(e) => setAssocProfsPhd(Math.min(assocProfs, Math.max(0, Number(e.target.value))))}
                  className="app-control w-20 rounded border border-border bg-bg-0 p-1.5 text-center font-bold text-xs text-text-heading"
                />
              </div>
            </div>

            {/* Assistant Professor Input */}
            <div className="rounded-lg border border-border bg-bg-1 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text-heading block">Assistant Professors</span>
                  <span className="text-[11px] text-text-muted">Master's / Ph.D.</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={asstProfs}
                  onChange={(e) => setAsstProfs(Math.max(0, Number(e.target.value)))}
                  className="app-control w-20 rounded border border-border bg-bg-0 p-1.5 text-center font-bold text-sm text-text-heading"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Real-time Evaluation & Cadre Breakdown */}
      <div className="w-full min-w-0 space-y-6">
          {/* Key Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-bg-1 p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Total Students</span>
              <p className="text-2xl font-black text-text-heading">{totalStudents}</p>
              <span className="text-[11px] text-text-muted">{annualIntake} × {durationYears} Yrs</span>
            </div>

            <div className="rounded-xl border border-border bg-bg-1 p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Required Faculty</span>
              <p className="text-2xl font-black text-text-heading">{requiredFaculty}</p>
              <span className="text-[11px] text-text-muted">At 1:{targetFsr} Ratio</span>
            </div>

            <div className="rounded-xl border border-border bg-bg-1 p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Existing Faculty</span>
              <p className={`text-2xl font-black ${totalDeficit > 0 ? "text-error-text" : "text-success-text"}`}>
                {totalExistingFaculty}
              </p>
              <span className="text-[11px] text-text-muted">
                {totalDeficit > 0 ? `Deficit: -${totalDeficit}` : "Requirement Met"}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-bg-1 p-4 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">Current FSR</span>
              <p className={`text-2xl font-black ${Number(currentRatio) > targetFsr ? "text-error-text" : "text-success-text"}`}>
                1:{currentRatio}
              </p>
              <span className="text-[11px] text-text-muted">Norm: 1:{targetFsr}</span>
            </div>
          </div>

          {/* Compliance Verdict Card */}
          <Card className={`border ${hasAnyDeficiency ? "border-error-border bg-error-bg/15" : "border-success-border bg-success-bg/15"}`}>
            <CardContent className="p-5 flex items-start gap-3.5">
              {hasAnyDeficiency ? (
                <AlertTriangle className="h-6 w-6 shrink-0 text-error-text mt-0.5" />
              ) : (
                <CheckCircle2 className="h-6 w-6 shrink-0 text-success-text mt-0.5" />
              )}
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-text-heading">
                  {hasAnyDeficiency
                    ? "Deficiencies Identified under AICTE Cadre & FSR Norms"
                    : "Zero Deficiencies — Fully Compliant with AICTE Cadre Roster"}
                </h3>
                <p className="text-xs leading-relaxed text-text-secondary">
                  {hasAnyDeficiency
                    ? "Non-compliance in faculty cadres triggers reduction of approved intake or withholding of extension of approval during Scrutiny Committee review."
                    : "The faculty roster adheres to 1:2:6 cadre distribution and mandatory doctoral qualification benchmarks."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Cadre Analysis Table */}
          <Card className="border-border">
            <CardHeader className="border-b border-border bg-bg-1 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-text-heading">
                    1:2:6 Cadre Breakdown & Deficit Register
                  </CardTitle>
                  <CardDescription className="text-xs text-text-secondary">
                    Normative cadre allocation based on {requiredFaculty} total faculty requirement
                  </CardDescription>
                </div>
                <span className="font-mono text-xs font-bold text-accent-strong bg-bg-2 px-2.5 py-1 rounded border border-border">
                  Ratio: 1 : 2 : 6
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-bg-2 text-text-muted font-bold uppercase tracking-wider">
                      <th className="p-3.5">Cadre Designation</th>
                      <th className="p-3.5 text-center">Required (AICTE Norm)</th>
                      <th className="p-3.5 text-center">Currently Appointed</th>
                      <th className="p-3.5 text-center">Ph.D. Compliant</th>
                      <th className="p-3.5 text-right">Deficit / Surplus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {/* Professor Row */}
                    <tr className="hover:bg-bg-2/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-text-heading">Professor</div>
                        <div className="text-[11px] text-text-muted">Cadre share: 1/9th of faculty</div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-text-heading">{reqProfessors}</td>
                      <td className="p-3.5 text-center font-bold text-text-heading">{professors}</td>
                      <td className="p-3.5 text-center">
                        <span className={`font-semibold ${profPhdMissing > 0 ? "text-error-text" : "text-success-text"}`}>
                          {professorsPhd} / {professors}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {profDeficit > 0 ? (
                          <span className="rounded bg-error-bg border border-error-border px-2 py-0.5 font-bold text-error-text">
                            Deficit: -{profDeficit}
                          </span>
                        ) : (
                          <span className="rounded bg-success-bg border border-success-border px-2 py-0.5 font-bold text-success-text">
                            Compliant (+{Math.abs(profDeficit)})
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Associate Professor Row */}
                    <tr className="hover:bg-bg-2/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-text-heading">Associate Professor</div>
                        <div className="text-[11px] text-text-muted">Cadre share: 2/9th of faculty</div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-text-heading">{reqAssocProfs}</td>
                      <td className="p-3.5 text-center font-bold text-text-heading">{assocProfs}</td>
                      <td className="p-3.5 text-center">
                        <span className={`font-semibold ${assocPhdMissing > 0 ? "text-error-text" : "text-success-text"}`}>
                          {assocProfsPhd} / {assocProfs}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {assocDeficit > 0 ? (
                          <span className="rounded bg-error-bg border border-error-border px-2 py-0.5 font-bold text-error-text">
                            Deficit: -{assocDeficit}
                          </span>
                        ) : (
                          <span className="rounded bg-success-bg border border-success-border px-2 py-0.5 font-bold text-success-text">
                            Compliant (+{Math.abs(assocDeficit)})
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Assistant Professor Row */}
                    <tr className="hover:bg-bg-2/50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-text-heading">Assistant Professor</div>
                        <div className="text-[11px] text-text-muted">Cadre share: 6/9th (balance)</div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-text-heading">{reqAsstProfs}</td>
                      <td className="p-3.5 text-center font-bold text-text-heading">{asstProfs}</td>
                      <td className="p-3.5 text-center text-text-muted">—</td>
                      <td className="p-3.5 text-right">
                        {asstDeficit > 0 ? (
                          <span className="rounded bg-error-bg border border-error-border px-2 py-0.5 font-bold text-error-text">
                            Deficit: -{asstDeficit}
                          </span>
                        ) : (
                          <span className="rounded bg-success-bg border border-success-border px-2 py-0.5 font-bold text-success-text">
                            Compliant (+{Math.abs(asstDeficit)})
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Total Summary Row */}
                    <tr className="bg-bg-2 font-bold text-text-heading">
                      <td className="p-3.5">TOTAL FACULTY ROSTER</td>
                      <td className="p-3.5 text-center">{requiredFaculty}</td>
                      <td className="p-3.5 text-center">{totalExistingFaculty}</td>
                      <td className="p-3.5 text-center">{professorsPhd + assocProfsPhd} Ph.D.</td>
                      <td className="p-3.5 text-right">
                        {totalDeficit > 0 ? (
                          <span className="text-error-text">Net Shortfall: -{totalDeficit}</span>
                        ) : (
                          <span className="text-success-text">Net Compliant</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Regulatory Advisory Footnote */}
          <div className="rounded-lg border border-border bg-bg-1 p-4 space-y-2 text-xs text-text-secondary leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-text-heading">
              <BookOpen className="h-4 w-4 text-accent-strong" />
              <span>AICTE Regulatory Notes on Cadre Deficiencies:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              <li>
                <strong>Adjunct / Emeritus Faculty:</strong> Up to 20% of required faculty can be drawn from Industry Adjunct or Emeritus Professors, provided they hold relevant professional experience.
              </li>
              <li>
                <strong>Ph.D. Relaxation:</strong> For Assistant Professor cadres, Ph.D. is not mandatory at entry level, but Professors and Associate Professors must possess a doctoral degree from an AICTE/UGC recognized university.
              </li>
              <li>
                <strong>Multiple College Affiliation (Ghost Faculty):</strong> Faculty biometric Aadhaar IDs are verified against AICTE National Portal. Duplication triggers immediate withdrawal of approval for both colleges.
              </li>
            </ul>
          </div>
        </div>
    </div>
  );
}
