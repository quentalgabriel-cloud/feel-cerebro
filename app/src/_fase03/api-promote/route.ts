import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pessoaAtualOuErro } from "@/lib/pessoa-atual";
import { commitarMarkdown } from "@/lib/github";
import { proximoId, caminhoPara, construirMarkdown } from "@/lib/promocao";
import type { PromocaoInput } from "@/lib/types";

// Passo 4 do fluxo (MODELO-DE-DADOS.md §3.4). Assume promoção individual —
// qualquer um dos três promove sozinho (pergunta em aberto #4); duas
// pessoas discordando de uma promoção vira uma `relacao` do tipo
// `contradicts` proposta depois, não um bloqueio antes.
export async function POST(request: Request) {
  const { pessoa, erro } = await pessoaAtualOuErro();
  if (!pessoa) {
    return NextResponse.json({ erro }, { status: 401 });
  }

  const input = (await request.json()) as PromocaoInput;
  const supabase = await createClient();

  const { data: item, error: erroItem } = await supabase
    .from("itens_inbox")
    .select("*")
    .eq("id", input.itemInboxId)
    .single();

  if (erroItem || !item) {
    return NextResponse.json({ erro: "Item de inbox não encontrado." }, { status: 404 });
  }

  if (item.status === "promovido") {
    return NextResponse.json(
      { erro: `Já promovido como ${item.nota_promovida_id}.` },
      { status: 409 },
    );
  }

  if (!item.texto_bruto?.trim()) {
    return NextResponse.json(
      { erro: "Item sem texto extraído — não há conteúdo para promover ainda." },
      { status: 400 },
    );
  }

  try {
    const id = await proximoId(supabase, input.tipo);
    const caminho = caminhoPara(id, input.tipo, input.titulo);
    const criadoEm = new Date().toISOString();

    const markdown = construirMarkdown({
      id,
      tipo: input.tipo,
      titulo: input.titulo,
      escopo: input.escopo,
      epistemico: input.epistemico,
      confianca: input.confianca,
      autorNome: pessoa.nome,
      criadoEm,
      conteudo: item.texto_bruto,
    });

    const { commitSha } = await commitarMarkdown({
      caminho,
      conteudo: markdown,
      mensagem: `${id}: ${input.titulo}`,
    });

    const { data: nota, error: erroNota } = await supabase
      .from("notas_promovidas")
      .insert({
        id,
        tipo: input.tipo,
        titulo: input.titulo,
        eixo_id: input.eixoId ?? null,
        escopo: input.escopo,
        epistemico: input.epistemico ?? null,
        confianca: input.confianca ?? null,
        autor_id: pessoa.id,
        item_inbox_origem_id: item.id,
        caminho_arquivo: caminho,
        commit_sha: commitSha,
      })
      .select()
      .single();

    if (erroNota) throw new Error(erroNota.message);

    await supabase
      .from("itens_inbox")
      .update({
        status: "promovido",
        nota_promovida_id: id,
        promovido_em: criadoEm,
      })
      .eq("id", item.id);

    return NextResponse.json({ nota }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Falha desconhecida na promoção." },
      { status: 500 },
    );
  }
}
