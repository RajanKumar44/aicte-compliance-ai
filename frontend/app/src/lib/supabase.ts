import { createClient } from "@supabase/supabase-js";

const url = (
  import.meta.env.VITE_SUPABASE_URL ||
  "https://qhclgxquuiqijlsbsouc.supabase.co"
)?.trim();

const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_1EoPwPJ22hNDLrMSGuOR-w_2HumNUAl"
)?.trim();

export const supabaseConfigured = Boolean(url && publishableKey);

export const supabase = supabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
        storage: window.localStorage,
      },
    })
  : null;
