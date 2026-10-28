import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  Shield,
  UserPlus,
  LogIn,
  KeyRound,
  Sparkles,
  Server,
  Database,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/FormField";
import { seedBackendDemo } from "@/lib/api";

export function SignInPage() {
  const {
    loading,
    session,
    signInWithBackend,
    signInWithPassword,
    signUpWithPassword,
    sendSignInLink,
    activeBackendUrl,
  } = useAuth();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<"backend" | "signin" | "signup" | "magic">("backend");

  // Backend form states
  const [username, setUsername] = useState("admin");
  const [backendPassword, setBackendPassword] = useState("admin123456");

  // Supabase form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [institutionId, setInstitutionId] = useState("DEMO-INST-001");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  if (loading) {
    return <p className="py-12 text-center text-sm text-text-secondary" role="status">Checking your session…</p>;
  }

  if (session) {
    return <Navigate to={location.state?.from || "/history"} replace />;
  }

  async function handleBackendSignIn(u: string, p: string) {
    setMessage("");
    setError("");
    if (!u.trim() || !p) {
      setError("Please provide username and password.");
      return;
    }
    setSubmitting(true);
    const err = await signInWithBackend(u.trim(), p);
    setSubmitting(false);
    if (err) {
      setError(err);
    }
  }

  async function handleBackendSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleBackendSignIn(username, backendPassword);
  }

  async function handleSeedDemoData() {
    setMessage("");
    setError("");
    setSeeding(true);
    const result = await seedBackendDemo();
    setSeeding(false);
    if (result.ok) {
      setMessage("Backend demo data successfully initialized! You can now log in as admin or reviewer.");
    } else {
      setError(result.errors._server || result.errors._network || "Unable to trigger seed on backend.");
    }
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
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Server className="h-3.5 w-3.5 text-success-text" />
          <span>Connected backend:</span>
          <code className="rounded bg-bg-2 px-1.5 py-0.5 text-text-heading">{activeBackendUrl}</code>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-border">
        <button
          type="button"
          onClick={() => {
            setActiveTab("backend");
            setError("");
            setMessage("");
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === "backend"
              ? "border-primary-500 text-text-heading"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <Sparkles className="h-4 w-4 text-accent-strong" />
          <span>Backend Demo Auth</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("signin");
            setError("");
            setMessage("");
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === "signin"
              ? "border-primary-500 text-text-heading"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <LogIn className="h-4 w-4" />
          <span>Supabase Auth</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("signup");
            setError("");
            setMessage("");
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
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
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            activeTab === "magic"
              ? "border-primary-500 text-text-heading"
              : "border-transparent text-text-secondary hover:text-text-heading"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>Magic Link</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-error-border bg-error-bg/30 p-4 text-xs font-medium text-error-text" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-success-border bg-success-bg/30 p-4 text-xs font-medium text-success-text" role="status">
          {message}
        </div>
      )}

      {/* Backend Native / Demo Authentication Tab */}
      {activeTab === "backend" && (
        <div className="space-y-6">
          {/* Quick Demo Sign In Cards */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              One-Click Demo Credentials (No Email Limits)
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleBackendSignIn("admin", "admin123456")}
                className="group relative flex flex-col items-start gap-1.5 rounded-xl border border-border bg-bg-1 p-4 text-left transition-all hover:border-primary-500 hover:bg-bg-2"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-bold text-text-heading group-hover:text-primary-400">
                    Institution Admin
                  </span>
                  <Shield className="h-4 w-4 text-primary-400" />
                </div>
                <p className="text-xs text-text-secondary">Full applicant permissions & institution records</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted font-mono">
                  <span>admin / admin123456</span>
                </div>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleBackendSignIn("reviewer", "reviewer123456")}
                className="group relative flex flex-col items-start gap-1.5 rounded-xl border border-border bg-bg-1 p-4 text-left transition-all hover:border-primary-500 hover:bg-bg-2"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-bold text-text-heading group-hover:text-primary-400">
                    Scrutiny Officer
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-accent-strong" />
                </div>
                <p className="text-xs text-text-secondary">Scrutiny review queue & finding determination</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted font-mono">
                  <span>reviewer / reviewer123456</span>
                </div>
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleBackendSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-heading" htmlFor="backend-username">
                    Username
                  </label>
                  <Input
                    id="backend-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or reviewer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-text-heading" htmlFor="backend-password">
                    Password
                  </label>
                  <Input
                    id="backend-password"
                    type="password"
                    required
                    value={backendPassword}
                    onChange={(e) => setBackendPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Signing in…" : "Sign In with Backend"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between rounded-xl border border-border bg-bg-1 p-3.5 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-text-muted" />
              <span>Need to bootstrap demo users on fresh database?</span>
            </div>
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedDemoData}
              className="font-bold text-primary-400 hover:underline disabled:opacity-50"
            >
              {seeding ? "Seeding…" : "Seed Demo Accounts"}
            </button>
          </div>
        </div>
      )}

      {/* Supabase Password Sign In Tab */}
      {activeTab === "signin" && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div className="rounded-lg border border-border bg-bg-2 p-3 text-xs text-text-secondary">
                <p className="font-semibold text-text-heading">Email Rate Limit Notice</p>
                <p className="mt-1">
                  If you encounter &quot;Email rate limit exceeded&quot;, use the <strong>Backend Demo Auth</strong> tab
                  which logs in directly against the FastAPI backend with zero email limits.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-heading" htmlFor="supabase-email">
                  Institutional Email
                </label>
                <Input
                  id="supabase-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="applicant@institution.edu.in"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-heading" htmlFor="supabase-password">
                  Password
                </label>
                <Input
                  id="supabase-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Authenticating…" : "Sign In with Email"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Supabase Sign Up Tab */}
      {activeTab === "signup" && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-heading" htmlFor="signup-name">
                  Full Name
                </label>
                <Input
                  id="signup-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Dr. Rajesh Sharma"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-heading" htmlFor="signup-inst">
                  Institution ID
                </label>
                <Input
                  id="signup-inst"
                  type="text"
                  required
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  placeholder="DEMO-INST-001"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-heading" htmlFor="signup-email">
                  Official Email
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@college.ac.in"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-heading" htmlFor="signup-password">
                  Password (min 6 chars)
                </label>
                <Input
                  id="signup-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Creating account…" : "Register Institutional Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Magic Link Tab */}
      {activeTab === "magic" && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleMagicLink} className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                Receive a one-time cryptographic sign-in URL dispatched directly to your authorized institutional mailbox.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-text-heading" htmlFor="magic-email">
                  Registered Institutional Email
                </label>
                <Input
                  id="magic-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="registrar@college.ac.in"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Sending Link…" : "Dispatch One-Time Link"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
