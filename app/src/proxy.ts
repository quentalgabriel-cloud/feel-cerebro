import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca a sessão do Supabase Auth em toda requisição e redireciona para
// /login quem não está autenticado — não há rota pública além de /login e
// /auth/callback (mantida para um futuro fluxo de recuperação de senha;
// login em si é email+senha desde 2026-09-02 e não passa mais por aqui).
//
// Next.js 16 renomeou este arquivo de middleware.ts para proxy.ts (mesma
// função, nome de export diferente) — ver
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth/callback");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

// Rotas de API (ex.: /api/cron/keepalive) fazem sua própria autenticação
// (Bearer token, service role) e não carregam cookie de sessão do Supabase
// Auth — o Vercel Cron, por exemplo, nunca vai ter um usuário logado. Sem
// excluir /api daqui, este middleware redirecionava toda chamada de cron
// pra /login antes dela chegar no route handler, e o guard de CRON_SECRET
// nunca era executado (bug encontrado na verificação pós-deploy).
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
