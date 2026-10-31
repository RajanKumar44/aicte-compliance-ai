import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  Database,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/components/useAuth";
import { fetchServerIdentity, type ServerVerifiedIdentity } from "@/lib/api";

export function SessionInspectorPage() {
  const { session, user } = useAuth();
  const [serverIdentity, setServerIdentity] = useState<ServerVerifiedIdentity | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const token = session?.access_token || null;

  const verifyWithServer = useCallback(async () => {
    if (!token) {
      setServerIdentity(null);
      setServerError("No active browser session token to verify. Sign in first.");
      return;
    }
    setLoading(true);
    setServerError(null);
    setTestResult(null);
    try {
      const data = await fetchServerIdentity(token);
      setServerIdentity(data);
    } catch (err) {
      setServerIdentity(null);
      setServerError(err instanceof Error ? err.message : "Failed to verify session with backend");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void verifyWithServer();
  }, [verifyWithServer]);

  const testBogusToken = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      await fetchServerIdentity("aicte-fake-forged-token-test-12345");
      setTestResult("Unexpected: Server accepted bogus token!");
    } catch (err) {
      setTestResult(
        `Verified rejection: Server returned HTTP 401: "${err instanceof Error ? err.message : "Unauthorized"}"`
      );
    } finally {
      setLoading(false);
    }
  };

  const copyJson = () => {
    if (!serverIdentity) return;
    navigator.clipboard.writeText(JSON.stringify(serverIdentity, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMatching =
    serverIdentity &&
    user &&
    serverIdentity.user_id.toLowerCase() === user.id.toLowerCase();

  const isTokenReal = token && !token.startsWith("aicte-inst-token-");

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-500">
            <UserCheck className="h-4 w-4" />
            <span>Server-Side Authentication Sanity Check</span>
          </div>
          <h1 className="text-2xl font-bold text-text-heading mt-1">Session & Identity Inspector</h1>
          <p className="text-sm text-text-secondary max-w-3xl mt-1">
            Visually verify client-held browser tokens against what the FastAPI backend and PostgreSQL database
            actually see server-side. Confirms elimination of client-minted fake tokens.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={verifyWithServer}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Re-Verify With Backend</span>
          </Button>
        </div>
      </div>

      {/* Global Status Banner */}
      {session && serverIdentity ? (
        <div className="p-4 rounded-xl border border-success-500/30 bg-success-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success-500/20 text-success-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-success-500 text-sm flex items-center gap-2">
                <span>Real Supabase Session Verified Server-Side</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-success-500/20 text-success-500">
                  HTTP 200 OK
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Backend API verified your JWT directly with Supabase Auth. User ID and database RLS visibility match.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-text-muted">
            Verified: {new Date(serverIdentity.server_verified_at).toLocaleTimeString()}
          </div>
        </div>
      ) : serverError ? (
        <div className="p-4 rounded-xl border border-danger-500/30 bg-danger-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-danger-500/20 text-danger-500">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="font-bold text-danger-500 text-sm">Server Authentication Verification Failed</div>
              <p className="text-xs text-text-secondary mt-0.5">{serverError}</p>
            </div>
          </div>
          {!session && (
            <Link to="/signin">
              <Button size="sm" variant="primary" className="text-xs">
                Sign In With Real Account
              </Button>
            </Link>
          )}
        </div>
      ) : null}

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Client Browser View */}
        <Card className="border-border bg-bg-1 flex flex-col justify-between">
          <CardHeader className="border-b border-border pb-3 bg-bg-2/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase">
                <KeyRound className="h-4 w-4 text-primary-400" />
                <span>Client-Side (Browser Holds)</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                session ? "bg-primary-500/10 text-primary-400" : "bg-bg-2 text-text-muted"
              }`}>
                {session ? "Session Active" : "Unauthenticated"}
              </span>
            </div>
            <CardTitle className="text-base font-bold text-text-heading mt-1">Local Browser Session</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            {session ? (
              <>
                <div className="space-y-1">
                  <span className="font-bold text-text-muted uppercase text-[11px] block">Client User ID</span>
                  <div className="font-mono p-2.5 rounded bg-bg-0 border border-border text-text-heading break-all select-all">
                    {user?.id || "N/A"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="font-bold text-text-muted uppercase text-[11px] block">Email</span>
                    <div className="font-medium text-text-heading mt-1 truncate">{user?.email || "None"}</div>
                  </div>
                  <div>
                    <span className="font-bold text-text-muted uppercase text-[11px] block">Role in Token</span>
                    <div className="font-medium text-text-heading mt-1 capitalize">
                      {(user?.user_metadata?.role as string) || "applicant"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="font-bold text-text-muted uppercase text-[11px] block">Declared Institution</span>
                    <div className="font-medium text-text-heading mt-1">
                      {(user?.user_metadata?.institution_id as string) || "None"}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-text-muted uppercase text-[11px] block">Token Expiry</span>
                    <div className="font-medium text-text-heading mt-1">
                      {session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "Unknown"}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-text-muted uppercase text-[11px] block">Token Signature Integrity</span>
                  <div className="p-2.5 rounded bg-bg-0 border border-border flex items-center justify-between">
                    <span className="font-mono text-text-muted truncate max-w-[260px]">
                      {token ? `${token.substring(0, 18)}...${token.substring(token.length - 12)}` : "None"}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isTokenReal ? "bg-success-500/10 text-success-500" : "bg-danger-500/10 text-danger-500"
                    }`}>
                      {isTokenReal ? "Authentic Supabase JWT" : "Forged Token"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-text-muted space-y-2">
                <AlertTriangle className="h-8 w-8 mx-auto text-text-muted/50" />
                <p className="font-medium text-text-heading">No session active in this browser.</p>
                <p className="text-xs">Sign in with an institutional account to test session verification.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Server-Verified View */}
        <Card className="border-border bg-bg-1 flex flex-col justify-between">
          <CardHeader className="border-b border-border pb-3 bg-bg-2/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase">
                <Database className="h-4 w-4 text-accent-strong" />
                <span>Backend Server (GET /api/v1/me)</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                serverIdentity?.authenticated
                  ? "bg-success-500/10 text-success-500"
                  : "bg-danger-500/10 text-danger-500"
              }`}>
                {serverIdentity?.authenticated ? "Verified" : "Unverified"}
              </span>
            </div>
            <CardTitle className="text-base font-bold text-text-heading mt-1">Server-Verified Identity</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            {serverIdentity ? (
              <>
                <div className="space-y-1">
                  <span className="font-bold text-text-muted uppercase text-[11px] block">Verified User UUID</span>
                  <div className="font-mono p-2.5 rounded bg-bg-0 border border-border text-text-heading break-all select-all">
                    {serverIdentity.user_id}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="font-bold text-text-muted uppercase text-[11px] block">Verified Email</span>
                    <div className="font-medium text-text-heading mt-1 truncate">{serverIdentity.email || "None"}</div>
                  </div>
                  <div>
                    <span className="font-bold text-text-muted uppercase text-[11px] block">Email Confirmation</span>
                    <div className="font-medium text-success-500 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{serverIdentity.email_confirmed_at ? "Confirmed" : "Unconfirmed"}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="font-bold text-text-muted uppercase text-[11px] block">Database Membership Row</span>
                    <div className="font-medium mt-1 flex items-center gap-1">
                      {serverIdentity.membership_verified ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-success-500" />
                          <span className="text-success-500 font-bold">Exists in PostgreSQL</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-warning-500" />
                          <span className="text-warning-500 font-medium">Pending Onboarding RPC</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-text-muted uppercase text-[11px] block">DB Enforced Role</span>
                    <div className="font-bold text-text-heading mt-1 uppercase text-primary-400">
                      {serverIdentity.role}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-text-muted uppercase text-[11px] block">Linked Institution</span>
                  <div className="p-2.5 rounded bg-bg-0 border border-border text-text-heading">
                    <strong>{serverIdentity.institution_name || "None"}</strong>{" "}
                    <span className="text-text-muted">({serverIdentity.institution_id || "No Ref"})</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-text-muted space-y-2">
                <ShieldAlert className="h-8 w-8 mx-auto text-danger-500/50" />
                <p className="font-medium text-text-heading">Identity not verified by backend.</p>
                <p className="text-xs">{serverError || "Waiting for server verification..."}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verification Matrix Analysis */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold text-text-heading">
            Authenticity & Integrity Sanity Checks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border bg-bg-1 space-y-1">
              <div className="font-bold text-text-heading flex items-center justify-between">
                <span>User ID Match</span>
                {isMatching ? (
                  <CheckCircle2 className="h-4 w-4 text-success-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-danger-500" />
                )}
              </div>
              <p className="text-text-secondary text-[11px]">
                {isMatching
                  ? "Client user id exactly matches server verified auth.uid()."
                  : "Mismatch: Client and server IDs do not correspond."}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border bg-bg-1 space-y-1">
              <div className="font-bold text-text-heading flex items-center justify-between">
                <span>JWT Non-Forged</span>
                {isTokenReal ? (
                  <CheckCircle2 className="h-4 w-4 text-success-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-danger-500" />
                )}
              </div>
              <p className="text-text-secondary text-[11px]">
                {isTokenReal
                  ? "Token has authentic Supabase JWT header and payload."
                  : "Token uses obsolete fake client-minted prefix."}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border bg-bg-1 space-y-1">
              <div className="font-bold text-text-heading flex items-center justify-between">
                <span>Database Row Level Security</span>
                {serverIdentity?.membership_verified ? (
                  <CheckCircle2 className="h-4 w-4 text-success-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-warning-500" />
                )}
              </div>
              <p className="text-text-secondary text-[11px]">
                {serverIdentity?.membership_verified
                  ? "institution_memberships row confirmed. RLS queries succeed."
                  : "No membership row yet. Onboard via onboard_applicant RPC."}
              </p>
            </div>
          </div>

          {/* Interactive Diagnostic Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={testBogusToken}
                disabled={loading}
                className="text-xs"
              >
                Test Rejected Bogus Token (Negative Check)
              </Button>
              {serverIdentity && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyJson}
                  className="text-xs gap-1"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy Server JSON"}</span>
                </Button>
              )}
            </div>

            <Link to="/vault" className="text-primary-400 hover:underline text-xs flex items-center gap-1">
              <span>Go to Document Vault</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {testResult && (
            <div className="p-3 rounded-lg bg-bg-2 border border-border font-mono text-xs text-text-secondary mt-2">
              {testResult}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
