import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
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
        if (!supabase) return "Authentication service is not configured for this deployment.";
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return error?.message ?? null;
      },

      async signUpWithPassword(email, password, metadata) {
        if (!supabase) {
          return { error: "Authentication service is not configured for this deployment." };
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

      async signOut() {
        if (!supabase) return null;
        const { error } = await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        return error?.message ?? null;
      },
    }),
    [loading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
