import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Cron semanal (ver ../../../../../../vercel.json) — MODELO-DE-DADOS.md
// §3.6, primeira metade: "faz uma leitura trivial no Supabase para evitar
// a pausa por inatividade do plano free". A segunda metade (curador de
// relações por similaridade) é Fase posterior — não implementada aqui de
// propósito, não há volume que justifique ainda
// (CEREBRO-DA-FEEL.md §6/§8).
//
// Usa a service role key porque não há sessão de usuário num cron job —
// as policies de RLS (0001_init.sql) só liberam a role `authenticated`,
// de propósito (nenhum dado deve vazar por um endpoint sem login). A
// service role bypassa RLS: escopo dela é só esta rota, nunca exposta ao
// client.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { count, error } = await supabase
    .from("candidates")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, candidates: count, executadoEm: new Date().toISOString() });
}
