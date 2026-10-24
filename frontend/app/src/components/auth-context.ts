import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";

export type DemoUser = {
  id: string;
  email: string;
  name: string;
  role: "applicant" | "reviewer" | "institution_admin";
  institution_id: string;
  institution_name: string;
};

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  demoUser: DemoUser | null;
  sendSignInLink: (email: string) => Promise<string | null>;
  signInAsDemo: (user: DemoUser) => void;
  signOut: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
