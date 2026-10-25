import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  MailCheck,
  Shield,
  UserPlus,
  LogIn,
  KeyRound,
  Info,
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/FormField";

export function SignInPage() {
  const { configured, loading, session, signInWithPassword, signUpWithPassword, sendSignInLink } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "magic">("signin");

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

  if (session) {
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
    <div className="mx-auto max-w-xl space-y-8 py-8 animate-fade-in">
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
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> are required for live authentication.
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
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
              <strong className="text-text-heading block">Option 1: Disable "Confirm Email" in Supabase (Recommended for Testing & Demos)</strong>
              <span>In your Supabase Dashboard (<a href="https://supabase.com/dashboard/project/qhclgxquuiqijlsbsouc/auth/providers" target="_blank" rel="noopener noreferrer" className="underline font-mono text-accent-strong">qhclgxquuiqijlsbsouc</a>) → <strong>Authentication</strong> → <strong>Providers</strong> → <strong>Email</strong> → toggle <strong>Confirm email</strong> OFF. Users can then register and log in instantly without sending emails.</span>
            </div>
            <div>
              <strong className="text-text-heading block">Option 2: Sign In with Password Directly</strong>
              <span>If your account is already registered, use the <strong>Email & Password</strong> tab. Password authentication does not send emails and will not trigger rate limits.</span>
            </div>
            <div>
              <strong className="text-text-heading block">Option 3: Connect Custom SMTP (For Production)</strong>
              <span>In Supabase Dashboard → <strong>Project Settings</strong> → <strong>Authentication</strong> → <strong>SMTP Settings</strong>, configure custom SMTP (Resend, Brevo, SendGrid) to remove default free-tier volume caps.</span>
            </div>
          </div>
          {activeTab !== "signin" && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("signin");
                setError("");
              }}
              className="inline-flex items-center gap-1.5 rounded bg-bg-1 border border-border px-3 py-1.5 font-bold text-xs text-text-heading hover:bg-bg-2"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Switch to Email & Password Sign In</span>
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
                Supabase email confirmation depends on project SMTP configuration. If external confirmation emails are delayed, contact your project operator or log in directly if confirmation is disabled on the project.
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

      <footer className="text-center text-xs text-text-muted space-y-1">
        <p>
          AICTE Compliance AI uses Supabase Authentication with Row-Level Security (RLS).
        </p>
        <p>
          No administrative privileges are granted through self-service registration.
        </p>
      </footer>
    </div>
  );
}
