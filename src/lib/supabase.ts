import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side only. Never call at module scope — only inside request handlers.
//
// getSupabaseAnon()  — public read operations (API routes). Uses SUPABASE_ANON_KEY.
// getSupabase()      — privileged writes (worker only). Uses SUPABASE_SERVICE_ROLE_KEY.
// isSupabaseConfigured() — true when SUPABASE_URL + SUPABASE_ANON_KEY are both set.
//   Use this to decide between the live DB path and the JSON fallback.

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export function getSupabaseAnon(): SupabaseClient {
  if (!anonClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_ANON_KEY must be set. Check isSupabaseConfigured() before calling this."
      );
    }
    anonClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

export function getSupabase(): SupabaseClient {
  if (!serviceClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
      );
    }
    serviceClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}
