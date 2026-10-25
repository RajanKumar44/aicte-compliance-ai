import { useState, type FormEvent } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import {
  AlertTriangle,
  MailCheck,
  Shield,
  UserPlus,
  LogIn,
  KeyRound,
  Info,
  Sparkles,
  CheckCircle2,
  Building2,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import type { DemoUser } from "@/components/auth-context";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/FormField";

const DEMO_ACCOUNTS: DemoUser[] = [
  {
    id: "demo-principal-01",
    email: "principal@engineering-inst.ac.in",
    name: "Dr. R. Raman",
    role: "applicant",
    institution_id: "SYNTH-INST-001",
    institution_name: "Apex Institute of Technology & Engineering",
  },
  {
    id: "demo-auditor-02",
    email: "reviewer.scrutiny@aicte-council.gov.in",
    name: "Prof. S. Sen",
    role: "reviewer",
    institution_id: "REG-WEST-042",
    institution_name: "AICTE Western Regional Scrutiny Panel",
  },
  {
    id: "demo-admin-03",
    email: "registrar@polytechnic-board.edu.in",
    name: "S. Iyer",
    role: "institution_admin",
    institution_id: "POLY-CENT-108",
    institution_name: "Central State Polytechnic Directorate",
  },
];

export function SignInPage() {
  const {
    configured,
    loading,
    session,
    demoUser,
    signInAsDemo,
    signInWithPassword,
    signUpWithPassword,
    sendSignInLink,
  } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<"demo" | "signin" | "signup" | "magic">("demo");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [institutionId, setInstitutionId] = useState("SYNTH-INST-001");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <p className="py-12 text-center text-sm text-text-secondary" role="status">Checking your session…</p>;
  }

  if (session || demoUser) {
    return <Navigate to={location.state?.from || "/history"} replace />;
  }

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!email.trim() || !password) {
      setError("Please provide both email and password.");
      return;
    }
    setSubmitting(true);
    const err = await signInWithPassword(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!email.trim() || !password) {
      setError("Please provide email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    const result = await signUpWithPassword(email.trim(), password, {
      full_name: fullName.trim(),
      institution_id: institutionId.trim(),
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else if (result.confirmationRequired) {
      setMessage(
        "Account created! Please check your email inbox to confirm your account before signing in."
      );
    } else {
      setMessage("Account created and signed in successfully!");
    }
  }

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setSubmitting(true);
    const err = await sendSignInLink(email.trim());
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setMessage("A secure sign-in link has been dispatched to your email address.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8 animate-fade-in">
      <header className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-2 px-3 py-1 text-xs font-bold text-text-heading">
          <Shield className="h-3.5 w-3.5 text-accent-strong" aria-hidden="true" />
          <span>Institutional Access Portal</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-heading sm:text-4xl">
          Sign In to Compliance Workspace
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
          Access institutional document verification records, automated scrutiny findings, and regulatory audit history.
        </p>
      </header>

      {!configured && (
        <div className="rounded-xl border border-warning-border bg-warning-bg/40 p-4 text-xs text-text-body space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-warning-text">
            <AlertTriangle className="h-4 w-4" />
            Supabase Configuration Notice
          </p>
          <p className="leading-relaxed">
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> are optional for local demo mode, but required for remote database sync.
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-border">
        <button
          type="button"
          onClick={() => {
            setActiveTab("demo");
            setError("");
            setMessage("");
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
            activeTab === "demo"
              ? "border-primary-500 text-text-heading"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>1-Click Institutional Demo</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("signin");
            setError("");
            setMessage("");
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
            activeTab === "signin"
              ? "border-primary-500 text-text-heading"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <LogIn className="h-4 w-4" />
          <span>Email & Password</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("signup");
            setError("");
            setMessage("");
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
            activeTab === "signup"
              ? "border-primary-500 text-text-heading"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>Create Account</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("magic");
            setError("");
            setMessage("");
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
            activeTab === "magic"
              ? "border-primary-500 text-text-heading"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Magic Link</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-error-border bg-error-bg/30 p-4 text-xs text-error-text flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="font-semibold leading-relaxed">{error}</p>
        </div>
      )}

      {error && (error.toLowerCase().includes("rate limit") || error.toLowerCase().includes("over_email_send_rate_limit")) && (
        <div className="rounded-lg border border-warning-border bg-warning-bg/40 p-4 text-xs text-text-body space-y-3">
          <div className="flex items-center gap-1.5 font-bold text-text-heading">
            <Info className="h-4 w-4 text-accent-strong shrink-0" />
            <span>How to Resolve Email Rate Limits in Supabase</span>
          </div>
          <div className="space-y-2 text-[11px] leading-relaxed text-text-secondary">
            <div>
              <strong className="text-text-heading block">Option 1: Use 1-Click Institutional Demo (Instant Access)</strong>
              <span>Switch to the <strong>1-Click Institutional Demo</strong> tab above to log in immediately with full scrutiny, history, and export features. No email send required.</span>
            </div>
            <div>
              <strong className="text-text-heading block">Option 2: Disable "Confirm Email" in Supabase</strong>
              <span>In Supabase Dashboard (<a href="https://supabase.com/dashboard/project/qhclgxquuiqijlsbsouc/auth/providers" target="_blank" rel="noopener noreferrer" className="underline font-mono text-accent-strong">qhclgxquuiqijlsbsouc</a>) → <strong>Authentication</strong> → <strong>Providers</strong> → <strong>Email</strong> → toggle <strong>Confirm email</strong> OFF. Users can then register and log in instantly without sending emails.</span>
            </div>
            <div>
              <strong className="text-text-heading block">Option 3: Sign In with Password Directly</strong>
              <span>If your account is already registered, use the <strong>Email & Password</strong> tab. Password authentication does not send emails and will not trigger rate limits.</span>
            </div>
          </div>
          {activeTab !== "demo" && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("demo");
                setError("");
              }}
              className="inline-flex items-center gap-1.5 rounded bg-bg-1 border border-border px-3 py-1.5 font-bold text-xs text-text-heading hover:bg-bg-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Switch to 1-Click Institutional Demo</span>
            </button>
          )}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-success-border bg-success-bg/30 p-4 text-xs text-success-text flex items-start gap-2">
          <MailCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="font-semibold leading-relaxed">{message}</p>
        </div>
      )}

      {/* Tab 0: 1-Click Institutional Demo */}
      {activeTab === "demo" && (
        <section className="space-y-5" aria-labelledby="demo-roles-heading">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-bg-2 p-4 text-sm text-text-body">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-text" aria-hidden="true" />
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
                  className="cursor-pointer transition-all duration-200 hover:border-primary-400 hover:shadow-md"
                  onClick={() => signInAsDemo(account)}
                >
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-2 text-text-heading">
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
                        <p className="text-xs text-text-muted">
                          {account.institution_name} ({account.institution_id})
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
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

      {/* Tab 1: Password Sign In */}
      {activeTab === "signin" && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-5">
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="signin-email">
                  Institutional Email
                </label>
                <Input
                  id="signin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="signin-password">
                  Password
                </label>
                <Input
                  id="signin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={submitting}
                leftIcon={<LogIn className="h-4 w-4" />}
              >
                {submitting ? "Signing in…" : "Sign In to Workspace"}
              </Button>
            </form>

            <p className="text-center text-xs text-text-secondary">
              Don't have an institutional account yet?{" "}
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className="font-bold text-text-heading underline underline-offset-4 hover:text-accent-strong"
              >
                Create Account
              </button>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Account Creation */}
      {activeTab === "signup" && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-5">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="signup-name">
                  Full Name
                </label>
                <Input
                  id="signup-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Rajesh Raman"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="signup-institution">
                  Institution ID / Reference
                </label>
                <Input
                  id="signup-institution"
                  type="text"
                  required
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  placeholder="e.g. SYNTH-INST-001 or 1-10928172"
                />
                <p className="text-[11px] text-text-muted">
                  New registrations are granted 'applicant' membership to scope history securely.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="signup-email">
                  Institutional Email
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coordinator@institution.edu"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="signup-password">
                  Password
                </label>
                <Input
                  id="signup-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={submitting}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                {submitting ? "Creating account…" : "Register Institutional Account"}
              </Button>
            </form>

            <div className="rounded-lg border border-border bg-bg-2 p-3 text-[11px] text-text-secondary space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-text-heading">
                <Info className="h-3.5 w-3.5 text-accent-strong" />
                <span>Email Delivery Disclosure</span>
              </div>
              <p>
                Supabase email confirmation depends on project SMTP configuration. If external confirmation emails are delayed, use the <strong>1-Click Institutional Demo</strong> tab above to evaluate immediately.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Magic Link */}
      {activeTab === "magic" && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-5">
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="magic-email">
                  Institutional Email
                </label>
                <Input
                  id="magic-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                />
                <p className="text-[11px] text-text-muted">
                  We'll send a one-time passwordless sign-in link to this address.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={submitting}
                leftIcon={<KeyRound className="h-4 w-4" />}
              >
                {submitting ? "Sending link…" : "Send Magic Sign-In Link"}
              </Button>
            </form>
          </CardContent>
        </Card>
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
