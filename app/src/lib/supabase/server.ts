import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para Server Components, Route Handlers e Server Actions — usa a
// sessão do cookie do usuário logado, respeitando RLS (nunca a service
// role key aqui: essa fica só em rotas que precisam ignorar RLS de
// propósito, como o cron de manutenção).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component sem permissão de escrever
            // cookie — inofensivo se o middleware já cuida do refresh de
            // sessão (ver proxy.ts).
          }
        },
      },
    },
  );
}
