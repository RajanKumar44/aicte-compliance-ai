import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { API_BASE, loginWithBackend, getBackendUserProfile } from "@/lib/api";

const BACKEND_AUTH_KEY = "aicte_backend_auth_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"backend" | "supabase" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // 1. First check if there is an active native backend JWT session
    try {
      const stored = localStorage.getItem(BACKEND_AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Session & { expires_at?: number };
        if (parsed?.access_token) {
          const isExpired = parsed.expires_at && parsed.expires_at * 1000 < Date.now();
          if (!isExpired) {
            setSession(parsed);
            setUser(parsed.user);
            setAuthMode("backend");
            setLoading(false);
            return;
          } else {
            localStorage.removeItem(BACKEND_AUTH_KEY);
          }
        }
      }
    } catch {
      // Ignore parse error
    }

    // 2. Otherwise check Supabase session if configured
    if (supabase) {
      void supabase.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (!error && data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setAuthMode("supabase");
        }
        setLoading(false);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        if (nextSession) {
          setSession(nextSession);
          setUser(nextSession.user ?? null);
          setAuthMode("supabase");
        }
        setLoading(false);
      });

      return () => {
        active = false;
        data.subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: true,
      loading,
      session,
      user,
      authMode,
      activeBackendUrl: API_BASE || "Same-origin / Dev proxy",

      async signInWithBackend(username: string, password: string) {
        const result = await loginWithBackend({ username, password });
        if (!result.ok) {
          return (
            result.errors._auth ||
            result.errors._server ||
            result.errors._network ||
            "Authentication failed. Please verify credentials."
          );
        }

        const tokenData = result.data;
        const profileResult = await getBackendUserProfile(tokenData.access_token);

        const displayName = profileResult.ok ? profileResult.data.display_name : username;
        const role = username === "reviewer" ? "Scrutiny Officer" : "Institution Admin";

        const backendSession = {
          access_token: tokenData.access_token,
          token_type: tokenData.token_type || "bearer",
          expires_at: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
          user: {
            id: profileResult.ok ? profileResult.data.id : username,
            email: `${username}@aicte-portal.local`,
            user_metadata: {
              full_name: displayName,
              username,
              role,
              institution_id: "DEMO-INST-001",
              institution_name: "Demo Engineering College",
            },
          } as unknown as User,
        } as unknown as Session;

        try {
          localStorage.setItem(BACKEND_AUTH_KEY, JSON.stringify(backendSession));
        } catch {
          // Ignore quota errors
        }

        setSession(backendSession);
        setUser(backendSession.user);
        setAuthMode("backend");
        return null;
      },

      async signInWithPassword(email, password) {
        if (!supabase) {
          return "Supabase external auth is not configured. Use Demo / Backend sign in.";
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!error) {
          setAuthMode("supabase");
        }
        return error?.message ?? null;
      },

      async signUpWithPassword(email, password, metadata) {
        if (!supabase) {
          return { error: "Supabase external auth is not configured for this deployment." };
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/history`,
          },
        });
        if (error) {
          return { error: error.message };
        }
        if (data.session && metadata?.institution_id) {
          try {
            await supabase.rpc("onboard_applicant", {
              p_external_ref: metadata.institution_id,
              p_display_name: metadata.institution_name || metadata.institution_id,
            });
          } catch {
            // best-effort onboarding
          }
        }
        const confirmationRequired = !data.session && Boolean(data.user);
        return { error: null, confirmationRequired };
      },

      async sendSignInLink(email) {
        if (!supabase) {
          return "Supabase external auth is not configured.";
        }
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: false,
            emailRedirectTo: `${window.location.origin}/history`,
          },
        });
        return error?.message ?? null;
      },

      async signOut() {
        try {
          localStorage.removeItem(BACKEND_AUTH_KEY);
        } catch {
          // Ignore
        }
        if (supabase) {
          await supabase.auth.signOut();
        }
        setSession(null);
        setUser(null);
        setAuthMode(null);
        return null;
      },
    }),
    [loading, session, user, authMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
