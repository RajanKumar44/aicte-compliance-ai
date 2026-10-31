import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (
    email: string,
    password: string,
    metadata?: { full_name?: string; institution_id?: string; institution_name?: string }
  ) => Promise<{ error: string | null; confirmationRequired?: boolean }>;
  sendSignInLink: (email: string) => Promise<string | null>;
  resetPasswordForEmail: (email: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
  signInAsDemo?: (role?: "applicant" | "reviewer", institutionId?: string) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
