import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AlertTriangle, MailCheck } from "lucide-react";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { Input } from "@/components/FormField";

export function SignInPage() {
  const { configured, loading, session, sendSignInLink } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  if (loading) return <p className="py-12 text-center text-sm text-text-secondary" role="status">Checking your session…</p>;
  if (session) return <Navigate to={location.state?.from || "/history"} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSending(true);
    const result = await sendSignInLink(email.trim());
    setSending(false);
    if (result) setError(result);
    else setMessage("If this address has been invited, a secure sign-in link will arrive shortly.");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-300">Institution access</p>
        <h1 className="text-3xl font-bold tracking-tight text-text-heading">Sign in</h1>
        <p className="text-sm leading-relaxed text-text-secondary">Use the email address provisioned by your institution administrator. New accounts are not created from this page.</p>
      </header>

      {!configured ? (
        <div className="flex items-start gap-3 border border-warning-border bg-warning-bg/30 p-4 text-sm leading-relaxed text-text-body" role="status">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-text" aria-hidden="true" />
          <p>Authentication is not configured for this deployment. History stays unavailable until the Supabase project values are added by the operator.</p>
        </div>
      ) : message ? (
        <Card><CardContent className="flex items-start gap-3 p-5 text-sm text-text-body" role="status"><MailCheck className="h-5 w-5 shrink-0 text-success-text" aria-hidden="true" /><p>{message}</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-heading" htmlFor="signin-email">Institution email</label>
                <Input id="signin-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              {error && <p className="text-sm text-error-text" role="alert">{error}</p>}
              <Button type="submit" disabled={sending || !email.trim()}>{sending ? "Sending link…" : "Send sign-in link"}</Button>
              <p className="text-xs leading-relaxed text-text-muted">The link expires according to the Supabase Auth settings. Access to an institution is granted separately by its administrator.</p>
            </form>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-text-secondary"><Link to="/" className="underline underline-offset-4 hover:text-text-heading">Return to dashboard</Link></p>
    </div>
  );
}
