import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoNota } from "@/lib/types";

const PREFIXO: Record<TipoNota, string> = {
  decision: "DEC",
  reasoning: "RT",
  insight: "INS",
  "open-loop": "OL",
  source: "SRC",
  "project-state": "PS",
};

const PASTA: Record<TipoNota, string> = {
  decision: "04-memoria/decisoes",
  reasoning: "04-memoria/raciocinios",
  insight: "04-memoria/insights",
  "open-loop": "04-memoria/open-loops",
  source: "02-fontes",
  "project-state": "03-projetos",
};

// Consulta o último id da sequência do tipo e devolve o próximo —
// MODELO-DE-DADOS.md §3.4. Ids nunca são reciclados nem renumerados
// (princípio 1): mesmo que uma promoção seja desfeita depois, o número não
// volta a ser usado.
export async function proximoId(
  supabase: SupabaseClient,
  tipo: TipoNota,
): Promise<string> {
  const prefixo = PREFIXO[tipo];
  const { data, error } = await supabase
    .from("notas_promovidas")
    .select("id")
    .eq("tipo", tipo)
    .order("criado_em", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const ultimo = data?.[0]?.id as string | undefined;
  const ultimoNumero = ultimo
    ? parseInt(ultimo.replace(`${prefixo}-`, ""), 10)
    : 0;
  const proximoNumero = (Number.isFinite(ultimoNumero) ? ultimoNumero : 0) + 1;

  return `${prefixo}-${String(proximoNumero).padStart(3, "0")}`;
}

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function caminhoPara(id: string, tipo: TipoNota, titulo: string): string {
  return `${PASTA[tipo]}/${id.toLowerCase()}-${slug(titulo)}.md`;
}

export function construirMarkdown(params: {
  id: string;
  tipo: TipoNota;
  titulo: string;
  escopo: string;
  epistemico?: string | null;
  confianca?: string | null;
  autorNome: string;
  criadoEm: string;
  conteudo: string;
}): string {
  const frontmatter = [
    "---",
    `id: ${params.id}`,
    `type: ${params.tipo}`,
    `title: "${params.titulo.replace(/"/g, '\\"')}"`,
    `scope: ${params.escopo}`,
    `status: ativa`,
    params.epistemico ? `epistemic: ${params.epistemico}` : "epistemic:",
    params.confianca ? `confidence: ${params.confianca}` : "confidence:",
    `author: ${params.autorNome}`,
    `created: ${params.criadoEm}`,
    "---",
    "",
  ].join("\n");

  return `${frontmatter}${params.conteudo}\n`;
}
