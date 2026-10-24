import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { AuthContext, type AuthContextValue, type DemoUser } from "./auth-context";

const DEMO_USER_KEY = "aicte_demo_user_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [demoUser, setDemoUser] = useState<DemoUser | null>(() => {
    try {
      const stored = localStorage.getItem(DEMO_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (!error && data.session) setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    configured: supabaseConfigured,
    loading,
    session,
    demoUser,
    signInAsDemo(user: DemoUser) {
      setDemoUser(user);
      try {
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
      } catch {
        // ignore storage errors
      }
    },
    async sendSignInLink(email) {
      if (!supabase) return "Authentication is not configured for this deployment.";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/history`,
        },
      });
      return error?.message ?? null;
    },
    async signOut() {
      setDemoUser(null);
      try {
        localStorage.removeItem(DEMO_USER_KEY);
      } catch {
        // ignore
      }
      if (!supabase) return null;
      const { error } = await supabase.auth.signOut();
      return error?.message ?? null;
    },
  }), [loading, session, demoUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
