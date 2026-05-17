// lib/supabase.ts - Supabase clients for ULTRON
// Server-side uses SERVICE_ROLE key (bypasses RLS, full access)
// Client-side uses ANON key (RLS protected, read-only public buckets)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
}

// Server-side client - full access via service role key
// ONLY use in API routes and server components, NEVER expose to browser
export function getServerClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server operations");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Client-side / public client - limited by RLS
export function getBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
