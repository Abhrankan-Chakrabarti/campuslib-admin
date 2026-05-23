/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_ at build time.
// Copy .env.example → .env and fill in your project values.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars. " +
    "Copy .env.example → .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

// Untyped client — domain types are applied in App.tsx via src/types.ts,
// which avoids the fragile manual Database generic that causes TS2353/TS2345.
export const supabase = createClient(supabaseUrl, supabaseKey);
