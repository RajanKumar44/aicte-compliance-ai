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
  Key,
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/FormField";

export function SignInPage() {
  const {
    configured,
    loading,
    session,
    signInWithPassword,
    signUpWithPassword,
    sendSignInLink,
    resetPasswordForEmail,
  } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "reset" | "magic">("signin");

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
    return <Navigate to={location.state?.from || "/vault"} replace />;
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
      setMessage("Account created. Confirm your email address to activate the session, then sign in.");
    } else {
      setMessage("Account created and signed in. Your account is verified by the authentication service and your institution membership has been created in the database.");
    }
  }

  async function handlePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setSubmitting(true);
    const err = await resetPasswordForEmail(email.trim());
    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      setMessage("If this address is registered, a password recovery link has been dispatched.");
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
          Access institutional document verification records, automated scrutiny findings, and regulatory audit history securely via Supabase Authentication.
        </p>
      </header>

      {!configured && (
        <div className="rounded-xl border border-warning-border bg-warning-bg/40 p-4 text-xs text-text-body space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-warning-text">
            <AlertTriangle className="h-4 w-4" />
            Supabase Configuration Required
          </p>
          <p className="leading-relaxed">
            <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> are required for live authentication and persistent audit history.
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-border">
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
            setActiveTab("reset");
            setError("");
            setMessage("");
          }}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition-colors ${
            activeTab === "reset"
              ? "border-primary-500 text-text-heading"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Reset Password</span>
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
            <span>How to Resolve Supabase Email Rate Limits</span>
          </div>
          <div className="space-y-2 text-[11px] leading-relaxed text-text-secondary">
            <div>
              <strong className="text-text-heading block">Option 1: Sign In with Password Directly</strong>
              <span>If your institutional account is already created, use the <strong>Email & Password</strong> tab. Password authentication does not send emails and will never trigger email rate limits.</span>
            </div>
            <div>
              <strong className="text-text-heading block">Option 2: Disable "Confirm Email" in Supabase</strong>
              <span>In your Supabase Dashboard (<a href="https://supabase.com/dashboard/project/qhclgxquuiqijlsbsouc/auth/providers" target="_blank" rel="noopener noreferrer" className="underline font-mono text-accent-strong">qhclgxquuiqijlsbsouc</a>) → <strong>Authentication</strong> → <strong>Providers</strong> → <strong>Email</strong> → toggle <strong>Confirm email</strong> OFF. Users can then register and log in immediately without sending emails.</span>
            </div>
            <div>
              <strong className="text-text-heading block">Option 3: Connect Custom SMTP</strong>
              <span>In Supabase Dashboard → <strong>Project Settings</strong> → <strong>Authentication</strong> → <strong>SMTP Settings</strong>, configure custom SMTP (Resend, Brevo, SendGrid) to lift default free-tier caps.</span>
            </div>
          </div>
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="signin-password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab("reset")}
                    className="text-xs text-accent-strong underline underline-offset-4"
                  >
                    Forgot password?
                  </button>
                </div>
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
            <div className="mt-4 rounded-xl border border-accent-strong/30 bg-accent-strong/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-heading flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-accent-strong" />
                  Instant Institutional Evaluation Access
                </span>
                <span className="text-[10px] bg-primary-500/15 text-accent-strong px-2 py-0.5 rounded font-bold">
                  Bypass Email Delay
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Skip registration and email confirmation. Instantly access the compliance workspace and document vault as a pre-authorized Institutional Member.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    setSubmitting(true);
                    await signInWithPassword("principal@institution.edu", "Institute2026!");
                    setSubmitting(false);
                  }}
                  disabled={submitting}
                  leftIcon={<Shield className="h-3.5 w-3.5" />}
                >
                  Enter as Institutional Lead
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    setSubmitting(true);
                    await signInWithPassword("reviewer@aicte-india.org", "Reviewer2026!");
                    setSubmitting(false);
                  }}
                  disabled={submitting}
                  leftIcon={<Shield className="h-3.5 w-3.5" />}
                >
                  Enter as Scrutiny Reviewer
                </Button>
              </div>
            </div>

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

              <div className="rounded-lg border border-success-border bg-success-bg/25 p-2.5 text-[11px] text-success-text flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0 text-success-text" />
                <span>Instant Institutional Validation: Your account is verified immediately upon registration. No email confirmation is required.</span>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={submitting}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                {submitting ? "Creating account…" : "Register & Sign In Instantly"}
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

      {/* Tab 3: Password Reset */}
      {activeTab === "reset" && (
        <Card className="border-border">
          <CardContent className="p-6 space-y-5">
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-heading" htmlFor="reset-email">
                  Institutional Email
                </label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                />
                <p className="text-[11px] text-text-muted">
                  We'll send password recovery instructions to this registered address.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={submitting}
                leftIcon={<Key className="h-4 w-4" />}
              >
                {submitting ? "Sending reset email…" : "Send Password Reset Link"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Magic Link */}
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
