"use client";

import { createBrowserClient } from "@supabase/ssr";

// Cliente para uso em Client Components. Lê as duas env vars públicas —
// nunca a service role key, que só existe no lado servidor
// (src/lib/supabase/server.ts e rotas de API).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
