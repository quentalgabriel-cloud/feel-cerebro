"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getProjectBySlug } from "@/lib/profile";
import { logEvent } from "@/lib/events";
import { fail, ok, MSG, type ActionResult } from "@/lib/action-result";
import {
  caminhoNoRepo,
  renderizarMarkdown,
  type ItemCanonico,
} from "@/lib/knowledge-markdown";
import { tituloSugerido } from "@/lib/capture-rules";
import type { KnowledgeType } from "@/lib/types";

// Promoção: de captura para conhecimento canônico.
//
// Esta ação NÃO escreve no Git. Ela registra a intenção com o Markdown já
// renderizado e o display_id já reservado, e para aí. Quem escreve é o worker
// (`scripts/promote.mjs`), que roda onde as credenciais de Git existem.
//
// A separação não é preguiça de integrar com a API do GitHub — é o que torna
// a falha segura possível. O plano mestre lista promoção parcial (commit feito,
// linha não gravada) como risco alto da Fase 03. Com intenção e efeito
// separados, o pior estado possível é uma fila parada; nunca um acervo
// afirmando que promoveu algo que não está no Git. E, de quebra, nenhum token
// de escrita do GitHub precisa existir na Vercel.

const REPO_POR_PROJETO: Record<string, string> = {
  cerebro: "quentalgabriel-cloud/cerebro",
  feel: "quentalgabriel-cloud/ecossistema-feel",
};

export async function promoverCandidate(
  slug: string,
  candidateId: string,
  _estado: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await ensureProfile();
  if (!profile) return fail(MSG.sessao);

  const project = await getProjectBySlug(slug);
  if (!project) return fail(MSG.projetoNaoEncontrado);

  const repo = REPO_POR_PROJETO[slug];
  if (!repo) {
    return fail(
      "Este projeto ainda não está ligado a um repositório de conhecimento.",
    );
  }

  const tipo = String(formData.get("tipo") ?? "").trim() as KnowledgeType;
  const titulo = String(formData.get("titulo") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "").trim();
  const epistemic = String(formData.get("epistemic") ?? "fato").trim();
  const confidence = String(formData.get("confidence") ?? "media").trim();

  if (!tipo) return fail("Escolha o tipo antes de promover.");
  if (!titulo) return fail("O item precisa de um título.");
  if (!corpo) return fail("O item precisa de um corpo — o que ficou decidido.");

  const supabase = await createClient();

  const { data: candidate, error: erroCandidate } = await supabase
    .from("candidates")
    .select("id, project_id, status, scope, raw_text")
    .eq("id", candidateId)
    .maybeSingle();

  if (erroCandidate) {
    console.error("promover: falha ao ler candidate", erroCandidate);
    return fail(MSG.leitura);
  }
  if (!candidate || candidate.project_id !== project.id) {
    return fail("Captura não encontrada neste projeto.");
  }
  if (candidate.status === "promoted") {
    return fail("Esta captura já foi promovida.");
  }

  // Reserva o display_id numa transação — `max()+1` seria corrida de verdade
  // com três pessoas promovendo (R-04 do plano).
  const { data: displayId, error: erroId } = await supabase.rpc(
    "next_display_id",
    { p_project: project.id, p_type: tipo },
  );

  if (erroId || !displayId) {
    console.error("promover: falha ao reservar display_id", erroId);
    return fail(MSG.escrita);
  }

  const hoje = new Date().toISOString().slice(0, 10);

  const item: ItemCanonico = {
    id: displayId as string,
    type: tipo,
    project: slug,
    scope: candidate.scope ?? "pessoal",
    status: "ativa",
    epistemic,
    confidence,
    created: hoje,
    updated: hoje,
    // Proveniência: o canônico aponta para a captura que o originou, e a
    // captura guarda o bruto. O resumo nunca substitui a fonte (INS-005).
    source: `candidates/${candidate.id}`,
    // Quem escreveu o corpo foi uma pessoa, neste formulário.
    origem: "gabriel-afirmou",
    related: [],
    supersedes: [],
    title: titulo,
    body: corpo,
  };

  const { error: erroFila } = await supabase.from("promotions").insert({
    project_id: project.id,
    candidate_id: candidate.id,
    display_id: displayId,
    repo,
    path: caminhoNoRepo(tipo, displayId as string, titulo),
    markdown: renderizarMarkdown(item),
    requested_by: profile.id,
  });

  if (erroFila) {
    console.error("promover: falha ao enfileirar", erroFila);
    return fail(
      erroFila.code === "23505"
        ? "Já existe um pedido de promoção para esta captura."
        : MSG.escrita,
    );
  }

  await logEvent(project.id, "candidate.created", profile.id, {
    content: `promoção pedida: ${displayId} — ${titulo}`,
  });

  revalidatePath(`/p/${slug}/memory`);
  return ok;
}


// ── upload ──────────────────────────────────────────────────────────────────
//
// Registra o que o navegador já subiu para o Storage. Esta ação nunca carrega
// o arquivo — ela recebe o caminho e os metadados, e amarra as três linhas que
// preservam a proveniência:
//
//   raw_files   o bruto, com caminho no Storage. Nunca é descartado.
//   sources     de onde veio, com escopo — viaja junto do conteúdo (DEC-007).
//   candidates  o que entrou e ainda não foi decidido.
//
// Se a extração não aconteceu (PDF, DOCX), o candidate nasce `pending` em vez
// de `ready_for_review`. Um candidate vazio marcado como pronto seria pior que
// nenhum candidate: entraria na fila de revisão sem ter o que revisar.
export async function registrarUpload(
  slug: string,
  dados: {
    storagePath: string;
    nome: string;
    mime: string;
    tamanho: number;
    texto: string | null;
  },
): Promise<ActionResult> {
  const profile = await ensureProfile();
  if (!profile) return fail(MSG.sessao);

  const project = await getProjectBySlug(slug);
  if (!project) return fail(MSG.projetoNaoEncontrado);

  const supabase = await createClient();

  const { data: arquivo, error: erroArquivo } = await supabase
    .from("raw_files")
    .insert({
      project_id: project.id,
      storage_path: dados.storagePath,
      original_name: dados.nome,
      mime_type: dados.mime,
      size_bytes: dados.tamanho,
      uploaded_by: profile.id,
    })
    .select("id")
    .single();

  if (erroArquivo || !arquivo) {
    console.error("registrarUpload: falha em raw_files", erroArquivo);
    return fail(MSG.escrita);
  }

  const { data: source, error: erroSource } = await supabase
    .from("sources")
    .insert({
      project_id: project.id,
      kind: "upload",
      title: dados.nome,
      locator: dados.storagePath,
      raw_file_id: arquivo.id,
      raw_text: dados.texto,
      captured_by: profile.id,
    })
    .select("id")
    .single();

  if (erroSource || !source) {
    console.error("registrarUpload: falha em sources", erroSource);
    return fail(MSG.escrita);
  }

  const extensao = dados.nome.toLowerCase().split(".").pop() ?? "";
  const origem =
    extensao === "pdf"
      ? "upload_pdf"
      : extensao === "docx"
        ? "upload_docx"
        : extensao === "md" || extensao === "markdown"
          ? "upload_markdown"
          : "upload_txt";

  const { error: erroCandidate } = await supabase.from("candidates").insert({
    project_id: project.id,
    author_id: profile.id,
    source_id: source.id,
    raw_file_id: arquivo.id,
    origin_type: origem,
    raw_text: dados.texto,
    suggested_title: dados.texto ? tituloSugerido(dados.texto) : dados.nome,
    // Sem texto extraído não há o que revisar — e dizer isso é o ponto.
    status: dados.texto ? "ready_for_review" : "pending",
  });

  if (erroCandidate) {
    console.error("registrarUpload: falha em candidates", erroCandidate);
    return fail(MSG.escrita);
  }

  await logEvent(project.id, "candidate.created", profile.id, {
    content: `upload: ${dados.nome}`,
  });

  revalidatePath(`/p/${slug}/memory`);
  return ok;
}
