import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { AuthContext, type AuthContextValue } from "./auth-context";

/**
 * Authentication is backed entirely by Supabase Auth.
 *
 * There is deliberately NO local fallback session generator: a session is only
 * ever created by the Supabase Auth server and verified server-side by the
 * backend API (auth/v1/user) and database RLS. Previously this file minted
 * fake tokens/user ids for "email not confirmed" or rate-limited sign-ups;
 * those sessions were invisible to the backend and database, which is exactly
 * the bug this rewrite removes. If Supabase reports an error, the real error
 * is shown. Onboarding (institution + membership rows) happens through the
 * database-side `onboard_applicant` RPC immediately after a real sign-up.
 */
const LOCAL_SESSION_KEY = "aicte_active_session";

function persistSession(next: Session | null) {
  try {
    if (next) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
        persistSession(data.session);
      } else if (error || !data.session) {
        // No valid Supabase session: drop any stale cached copy.
        setSession(null);
        setUser(null);
        persistSession(null);
      }
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      persistSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: supabaseConfigured,
      loading,
      session,
      user,

      async signInWithPassword(email, password) {
        if (!supabase) {
          return "Authentication service is not configured for this deployment.";
        }
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

          if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
            persistSession(data.session);
            return null;
          }
          return error?.message ?? "Invalid login credentials.";
        } catch {
          return "Authentication service is unreachable. Check your connection and try again.";
        }
      },

      async signUpWithPassword(email, password, metadata) {
        if (!supabase) {
          return { error: "Authentication service is not configured for this deployment." };
        }
        const cleanEmail = email.trim().toLowerCase();

        try {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: metadata,
              emailRedirectTo: `${window.location.origin}/history`,
            },
          });

          if (error) {
            // "Already registered" with matching credentials is a real sign-in, not a failure.
            if (error.message.toLowerCase().includes("already registered")) {
              const signInRes = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password,
              });
              if (signInRes.data?.session) {
                setSession(signInRes.data.session);
                setUser(signInRes.data.session.user);
                persistSession(signInRes.data.session);
                await onboardAfterSignIn(metadata);
                return { error: null, confirmationRequired: false };
              }
              return { error: "This email is already registered. Sign in instead — if you forgot the password, use 'Forgot Password'." };
            }
            return { error: error.message };
          }

          if (data.session) {
            // Email confirmation is disabled in this deployment (auto-confirm trigger),
            // so signUp returns a usable session directly.
            setSession(data.session);
            setUser(data.session.user);
            persistSession(data.session);
            await onboardAfterSignIn(metadata);
            return { error: null, confirmationRequired: false };
          }

          // The Auth server requires email confirmation before any session exists.
          return { error: null, confirmationRequired: true };
        } catch {
          return { error: "Authentication service is unreachable. Check your connection and try again." };
        }
      },

      async sendSignInLink(email) {
        if (!supabase) return "Authentication service is not configured for this deployment.";
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/history`,
          },
        });
        return error?.message ?? null;
      },

      async resetPasswordForEmail(email) {
        if (!supabase) return "Authentication service is not configured for this deployment.";
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/signin`,
        });
        return error?.message ?? null;
      },

      async signOut() {
        setSession(null);
        setUser(null);
        persistSession(null);
        if (!supabase) return null;
        const { error } = await supabase.auth.signOut();
        return error?.message ?? null;
      },
    }),
    [loading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Create the institution and applicant membership rows for a freshly
 * authenticated user. The RPC is DATABASE-side and security definer: it can
 * only run for the caller's own auth.uid(), only ever grants 'applicant',
 * and is idempotent on re-registration.
 */
async function onboardAfterSignIn(
  metadata?: { full_name?: string; institution_id?: string; institution_name?: string }
) {
  if (!supabase) return;
  const externalRef = metadata?.institution_id?.trim();
  if (!externalRef) return;
  try {
    await supabase.rpc("onboard_applicant", {
      p_external_ref: externalRef,
      p_display_name: metadata?.institution_name || externalRef,
    });
  } catch {
    // Onboarding failures surface on first data request: membership lookup
    // will honestly report that no institution is linked. Never fabricate one.
  }
}
