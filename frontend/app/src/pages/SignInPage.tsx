import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  MailCheck,
  Shield,
  Building2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/FormField";
import type { DemoUser } from "@/components/auth-context";

const DEMO_ACCOUNTS: DemoUser[] = [
  {
    id: "demo-admin-001",
    email: "principal@synth-inst-001.edu",
    name: "Dr. S. K. Raman",
    role: "institution_admin",
    institution_id: "SYNTH-INST-001",
    institution_name: "Example Technical Institute (Main Campus)",
  },
  {
    id: "demo-reviewer-002",
    email: "compliance@synth-inst-001.edu",
    name: "Prof. Anjali Verma",
    role: "reviewer",
    institution_id: "SYNTH-INST-001",
    institution_name: "Example Technical Institute (Main Campus)",
  },
  {
    id: "demo-auditor-003",
    email: "scrutiny@aicte-council.gov.in",
    name: "Er. Rajesh Kumar",
    role: "reviewer",
    institution_id: "AICTE-RO-DELHI",
    institution_name: "AICTE Regional Scrutiny Cell (North Zone)",
  },
];

export function SignInPage() {
  const { configured, loading, session, demoUser, signInAsDemo, sendSignInLink } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"demo" | "magic">("demo");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (loading) {
    return <p className="py-12 text-center text-sm text-text-secondary" role="status">Checking your session…</p>;
  }

  if (session || demoUser) {
    return <Navigate to={location.state?.from || "/history"} replace />;
  }

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSending(true);
    const result = await sendSignInLink(email.trim());
    setSending(false);
    if (result) setError(result);
    else setMessage("If this address has been provisioned, a secure sign-in link will arrive shortly.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8 animate-fade-in">
      <header className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-300">
          <Shield className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Institutional Access Portal</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-heading sm:text-4xl">
          Sign In to Compliance Workspace
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
          Access institutional document verification records, automated scrutiny findings, and regulatory audit history.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("demo")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "demo"
              ? "border-primary-400 text-primary-300"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>1-Click Institutional Demo</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("magic")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "magic"
              ? "border-primary-400 text-primary-300"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Email Magic Link</span>
        </button>
      </div>

      {activeTab === "demo" && (
        <section className="space-y-5" aria-labelledby="demo-roles-heading">
          <div className="flex items-start gap-3 rounded-lg border border-primary-800/40 bg-primary-950/20 p-4 text-sm text-text-body">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-400" aria-hidden="true" />
            <p>
              <strong>Fast Evaluation Mode:</strong> Select any institutional role below to instantly log in with full scrutiny and history features enabled. No email or external credentials required.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-1">
            {DEMO_ACCOUNTS.map((account) => {
              const isAdmin = account.role === "institution_admin";
              const isAuditor = account.email.includes("aicte-council");
              const Icon = isAdmin ? Building2 : isAuditor ? Shield : GraduationCap;

              return (
                <Card
                  key={account.id}
                  className="group cursor-pointer transition-all duration-200 hover:border-primary-500/50 hover:bg-bg-2"
                  onClick={() => signInAsDemo(account)}
                >
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-2 text-primary-300 group-hover:border-primary-400/50">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-text-heading">{account.name}</h3>
                          <span className="rounded bg-bg-3 px-2 py-0.5 text-[11px] font-medium text-text-muted uppercase tracking-wider">
                            {account.role.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary">{account.email}</p>
                        <p className="text-xs text-text-muted">{account.institution_name} ({account.institution_id})</p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="group-hover:bg-primary-500 group-hover:text-primary-950"
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      Sign In
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "magic" && (
        <section className="space-y-5" aria-labelledby="magic-link-heading">
          {!configured && (
            <div className="flex items-start gap-3 border border-warning-border bg-warning-bg/30 p-4 text-sm leading-relaxed text-text-body" role="status">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-text" aria-hidden="true" />
              <p>
                Remote Supabase Auth environment variables are not set in this deployment. Please switch to the <strong>1-Click Institutional Demo</strong> tab above to sign in instantly.
              </p>
            </div>
          )}

          {message ? (
            <Card>
              <CardContent className="flex items-start gap-3 p-5 text-sm text-text-body" role="status">
                <MailCheck className="h-5 w-5 shrink-0 text-success-text" aria-hidden="true" />
                <p>{message}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <form className="space-y-5" onSubmit={handleMagicLinkSubmit}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-heading" htmlFor="signin-email">
                      Registered Institutional Email
                    </label>
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={email}
                      placeholder="e.g. director@institution.edu.in"
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-error-text" role="alert">{error}</p>}
                  <Button type="submit" disabled={sending || !email.trim()}>
                    {sending ? "Sending secure link…" : "Send Sign-in Link"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      <footer className="flex items-center justify-between border-t border-border pt-5 text-sm text-text-secondary">
        <Link to="/" className="underline underline-offset-4 hover:text-text-heading">
          ← Return to dashboard
        </Link>
        <Link to="/validate" className="underline underline-offset-4 hover:text-text-heading">
          Launch validation workspace without signing in →
        </Link>
      </footer>
    </div>
  );
}
