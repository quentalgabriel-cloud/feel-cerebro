import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// STUB — extração de texto ainda não está implementada.
//
// A decisão de ferramenta já foi tomada (MarkItDown, ver
// PROMPT-BUSCA-OSS / CEREBRO-DA-FEEL.md §6), mas MarkItDown é uma
// biblioteca Python — rodá-la dentro de uma Vercel Function em Node exige
// ou (a) um runtime Python separado na Vercel, ou (b) um serviço HTTP
// próprio que a function chama. Nenhuma das duas está montada ainda; essa
// é a próxima peça de infraestrutura a decidir, não uma linha de código
// que falta escrever.
//
// Comportamento atual, deliberadamente honesto: marca o item como pronto
// para revisão manual, com texto_bruto nulo — exatamente o caminho que
// MODELO-DE-DADOS.md §3.2 já previa para falha de extração ("falha não
// trava o item, fica marcado para revisão manual, nunca silenciosamente
// perdido"). Um founder abre o arquivo original (link via arquivo_raw_id)
// e cola o texto manualmente até o extrator real existir.
export async function POST(request: Request) {
  const { itemInboxId } = (await request.json()) as { itemInboxId: string };
  const supabase = await createClient();

  const { error } = await supabase
    .from("itens_inbox")
    .update({ status: "pronto_para_revisao" })
    .eq("id", itemInboxId)
    .eq("status", "em_extracao");

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, extraido: false });
}
