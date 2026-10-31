import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { ScopeNotice } from "@/components/ScopeNotice";
import { useAuth } from "@/components/useAuth";
import {
  listApplications,
  createApplication,
  type ApplicationRecord,
} from "@/lib/api-applications";
import type { InstitutionAccess } from "@/lib/api";
import { fetchInstitutions } from "@/lib/api";

function statusBadge(status: string) {
  if (status === "preliminary_checks_passed") return <Badge variant="success">Preliminary check passed</Badge>;
  if (status === "attention_required") return <Badge variant="error">Attention required</Badge>;
  return <Badge variant="neutral">{status.replace(/_/g, " ")}</Badge>;
}

export function ApplicationsPage() {
  const auth = useAuth();
  const token = auth.session?.access_token;

  const [applications, setApplications] = useState<ApplicationRecord[] | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionAccess[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [institutionRef, setInstitutionRef] = useState("");
  const [applicationType, setApplicationType] = useState<ApplicationRecord["application_type"]>("eoa");
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [hostel, setHostel] = useState(false);
  const [newBuilding, setNewBuilding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const apps = await listApplications(token);
      setApplications(apps);
      const inst = await fetchInstitutions(token);
      setInstitutions(inst.ok ? inst.data : null);
      if (inst.ok && inst.data.length > 0) {
        setInstitutionRef((prev) => prev || inst.data[0].external_ref);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications.");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(async () => {
    if (!token || !institutionRef) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createApplication(
        {
          institution_id: institutionRef,
          application_type: applicationType,
          academic_year: academicYear.trim(),
          params: { hostel, new_building: newBuilding },
        },
        token,
      );
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Application creation failed.");
    } finally {
      setCreating(false);
    }
  }, [token, institutionRef, applicationType, academicYear, hostel, newBuilding, load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-heading">Applications</h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary">
          Create an Extension-of-Approval application and follow it through checklist generation,
          document upload, preliminary validation and human review.
        </p>
      </div>

      <ScopeNotice />

      <Card>
        <CardHeader>
          <CardTitle>Create application</CardTitle>
          <CardDescription>
            The checklist is generated automatically from the declared parameters. Items without a
            verified rule configuration stay marked <strong>pending configuration</strong> and are never
            evaluated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p role="alert" className="text-sm text-error-text">{error}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-text-heading">Institution</span>
              <select
                value={institutionRef}
                onChange={(e) => setInstitutionRef(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-1 px-3 py-2 text-sm text-text-body"
              >
                {(institutions ?? []).map((inst) => (
                  <option key={inst.id} value={inst.external_ref}>
                    {inst.display_name} ({inst.external_ref})
                  </option>
                ))}
                {institutions !== null && institutions.length === 0 && (
                  <option value="">No institution provisioned</option>
                )}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-text-heading">Application type</span>
              <select
                value={applicationType}
                onChange={(e) => setApplicationType(e.target.value as ApplicationRecord["application_type"])}
                className="w-full rounded-lg border border-border bg-bg-1 px-3 py-2 text-sm text-text-body"
              >
                <option value="eoa">Extension of Approval (EoA)</option>
                <option value="new_program">New program</option>
                <option value="intake_change">Intake change</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-text-heading">Academic year</span>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-1 px-3 py-2 text-sm text-text-body"
                placeholder="2026-27"
              />
            </label>
            <div className="space-y-1.5 text-sm">
              <span className="font-medium text-text-heading">Declarations used for conditional items</span>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={hostel} onChange={(e) => setHostel(e.target.checked)} />
                  Hostel on campus
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newBuilding} onChange={(e) => setNewBuilding(e.target.checked)} />
                  New building
                </label>
              </div>
            </div>
          </div>
          {createError && <p role="alert" className="text-sm text-error-text">{createError}</p>}
          <Button
            onClick={() => void submit()}
            disabled={creating || !token || !institutionRef || academicYear.trim().length < 4}
          >
            {creating ? "Creating…" : "Create application"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your applications</CardTitle>
          <CardDescription>Every application is scoped to your institution membership.</CardDescription>
        </CardHeader>
        <CardContent>
          {applications === null ? (
            <p className="text-sm text-text-secondary">Loading…</p>
          ) : applications.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No applications yet"
              description="Create the first application above to generate its checklist."
            />
          ) : (
            <ul className="divide-y divide-border">
              {applications.map((app) => (
                <li key={app.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link to={`/applications/${app.id}`} className="font-semibold text-text-heading hover:underline">
                      {app.application_type.toUpperCase()} · {app.academic_year}
                    </Link>
                    <p className="text-xs text-text-muted">
                      {app.institution_external_ref} · created {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(app.status)}
                    <Link
                      to={`/applications/${app.id}`}
                      className="text-xs font-medium text-text-secondary hover:text-text-heading"
                    >
                      Open →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
