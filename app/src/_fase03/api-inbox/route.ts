import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pessoaAtualOuErro } from "@/lib/pessoa-atual";
import type { TipoOrigem } from "@/lib/types";

// Heurística simples de título — primeira linha não vazia. Nunca decide
// sozinha, só sugere (MODELO-DE-DADOS.md, tabela itens_inbox).
function tituloSugerido(texto: string | null): string | null {
  if (!texto) return null;
  const linha = texto
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return linha ? linha.slice(0, 120) : null;
}

interface BodyColado {
  tipo_origem: "colado";
  texto_bruto: string;
}

interface BodyUpload {
  tipo_origem: Exclude<TipoOrigem, "colado">;
  arquivo: {
    storage_path: string;
    nome_original: string;
    mime_type: string;
    tamanho_bytes: number;
  };
}

// Passo 1 do fluxo (MODELO-DE-DADOS.md §3):
// - colado: insert direto, status pronto_para_revisao — sem passo intermediário.
// - upload: o arquivo já subiu direto pro Storage (ver /api/upload); aqui só
//   registramos arquivos_raw + itens_inbox com status em_extracao.
export async function POST(request: Request) {
  const { pessoa, erro } = await pessoaAtualOuErro();
  if (!pessoa) {
    return NextResponse.json({ erro }, { status: 401 });
  }

  const body = (await request.json()) as BodyColado | BodyUpload;
  const supabase = await createClient();

  if (body.tipo_origem === "colado") {
    if (!body.texto_bruto?.trim()) {
      return NextResponse.json(
        { erro: "Texto vazio." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("itens_inbox")
      .insert({
        autor_id: pessoa.id,
        tipo_origem: "colado",
        texto_bruto: body.texto_bruto,
        titulo_sugerido: tituloSugerido(body.texto_bruto),
        status: "pronto_para_revisao",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ item: data }, { status: 201 });
  }

  // Upload: registra o arquivo bruto (princípio 5 — a fonte nunca é
  // descartada) e o item de inbox correspondente.
  const { data: arquivoRaw, error: erroArquivo } = await supabase
    .from("arquivos_raw")
    .insert({
      storage_path: body.arquivo.storage_path,
      nome_original: body.arquivo.nome_original,
      mime_type: body.arquivo.mime_type,
      tamanho_bytes: body.arquivo.tamanho_bytes,
      enviado_por: pessoa.id,
    })
    .select()
    .single();

  if (erroArquivo || !arquivoRaw) {
    return NextResponse.json(
      { erro: erroArquivo?.message ?? "Falha ao registrar arquivo." },
      { status: 500 },
    );
  }

  const { data: item, error: erroItem } = await supabase
    .from("itens_inbox")
    .insert({
      autor_id: pessoa.id,
      tipo_origem: body.tipo_origem,
      arquivo_raw_id: arquivoRaw.id,
      titulo_sugerido: body.arquivo.nome_original,
      status: "em_extracao",
    })
    .select()
    .single();

  if (erroItem) {
    return NextResponse.json({ erro: erroItem.message }, { status: 500 });
  }

  // Dispara a extração de forma independente da resposta ao usuário — a
  // UI não espera o extrator terminar (MODELO-DE-DADOS.md §3.2: falha de
  // extração não trava o item, ele fica marcado para revisão manual).
  fetch(new URL("/api/extrair", request.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ itemInboxId: item.id }),
  }).catch(() => {
    // Melhor esforço — se a chamada falhar, o item fica em `em_extracao`
    // e alguém precisa reprocessar manualmente. Aceitável na Fase 1.
  });

  return NextResponse.json({ item }, { status: 201 });
}
