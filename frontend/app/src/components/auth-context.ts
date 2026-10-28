import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  authMode: "backend" | "supabase" | null;
  activeBackendUrl: string;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (
    email: string,
    password: string,
    metadata?: { full_name?: string; institution_id?: string; institution_name?: string }
  ) => Promise<{ error: string | null; confirmationRequired?: boolean }>;
  sendSignInLink: (email: string) => Promise<string | null>;
  signInWithBackend: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
