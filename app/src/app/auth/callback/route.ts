import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Não é mais usado pelo login (que passou a ser email+senha em
// 2026-09-02 — ver comentário em login/page.tsx). Mantido porque qualquer
// fluxo futuro baseado em link de e-mail (recuperação de senha, convite)
// precisa de um destino assim; se nada usar isto até a Fase 02, remover.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/projects`);
}
