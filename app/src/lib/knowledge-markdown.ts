import { slugify } from "@/lib/slug";

// O formato do conhecimento canônico: como se escreve e como se lê.
//
// ESTE ARQUIVO É A FRONTEIRA ENTRE O BANCO E O GIT, e existe por um motivo
// específico: a promoção escreve Markdown e o reindex lê Markdown. Se cada
// lado tivesse a sua própria noção do formato, eles divergiriam — e a
// divergência só apareceria meses depois, num arquivo que o índice deixou de
// entender. Um módulo, dois usos, e um teste de ida e volta que prova que
// `parse(render(x)) === x`.
//
// O formato é o do `SCHEMA.md` do vault `cerebro`: dez campos obrigatórios no
// frontmatter (DEC-002), corpo em Markdown embaixo.

export const CAMPOS_OBRIGATORIOS = [
  "id",
  "type",
  "project",
  "scope",
  "status",
  "epistemic",
  "confidence",
  "created",
  "updated",
  "source",
] as const;

export interface ItemCanonico {
  id: string;
  type: string;
  project: string;
  scope: string;
  status: string;
  epistemic: string;
  confidence: string;
  created: string;
  updated: string;
  source: string;
  /** De onde veio a afirmação — o campo que a DEC-012 preservou. */
  origem: "gabriel-afirmou" | "ai-inferido";
  related?: string[];
  supersedes?: string[];
  title: string;
  body: string;
}

// ── leitura ─────────────────────────────────────────────────────────────────

export interface Frontmatter {
  [chave: string]: string | string[];
}

/**
 * Parser deliberadamente pequeno: só o subconjunto de YAML que o SCHEMA.md
 * usa — `chave: valor` e listas em `[a, b]`. Uma dependência de YAML aqui
 * seria uma dependência a mais para ler arquivo que nós mesmos escrevemos, e
 * abriria espaço para o formato aceitar coisas que a escrita nunca produz.
 */
export function lerFrontmatter(texto: string): {
  meta: Frontmatter;
  corpo: string;
} {
  if (!texto.startsWith("---")) return { meta: {}, corpo: texto.trim() };

  const fim = texto.indexOf("\n---", 3);
  if (fim === -1) return { meta: {}, corpo: texto.trim() };

  const bruto = texto.slice(3, fim).trim();
  const corpo = texto.slice(fim + 4).trim();
  const meta: Frontmatter = {};

  for (const linha of bruto.split("\n")) {
    const sep = linha.indexOf(":");
    if (sep === -1) continue;

    const chave = linha.slice(0, sep).trim();
    if (!chave || chave.startsWith("#")) continue;

    let valor = linha.slice(sep + 1).trim();

    if (valor.startsWith("[") && valor.endsWith("]")) {
      const dentro = valor.slice(1, -1).trim();
      meta[chave] = dentro
        ? dentro.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""))
        : [];
      continue;
    }

    valor = valor.replace(/^["']|["']$/g, "");
    meta[chave] = valor;
  }

  return { meta, corpo };
}

/** Título é o primeiro `# ` do corpo. É onde o vault já o coloca. */
export function tituloDoCorpo(corpo: string, alternativa = ""): string {
  const h1 = corpo.split("\n").find((l) => l.startsWith("# "));
  return h1 ? h1.slice(2).trim() : alternativa;
}

// ── escrita ─────────────────────────────────────────────────────────────────

function valorYaml(v: string): string {
  // Aspas só quando o valor pode confundir o parser — `#` inicia comentário,
  // `:` separa chave, e colchete abre lista. Aspas em tudo poluiria o
  // frontmatter que uma pessoa lê no Obsidian.
  if (v === "") return '""';
  if (/^[[\]{}#&*!|>%@`]/.test(v) || v.includes(": ") || v.endsWith(":")) {
    return `"${v.replace(/"/g, '\\"')}"`;
  }
  return v;
}

/**
 * Renderiza o item no formato exato que `lerFrontmatter` lê de volta. A ordem
 * dos campos é fixa e não alfabética: é a ordem do SCHEMA.md, para que um
 * arquivo escrito pela promoção seja indistinguível, de olho, de um que o
 * Gabriel escreveu à mão no Obsidian.
 */
export function renderizarMarkdown(item: ItemCanonico): string {
  const linhas: string[] = ["---"];

  linhas.push(`id: ${valorYaml(item.id)}`);
  linhas.push(`type: ${valorYaml(item.type)}`);
  linhas.push(`project: ${valorYaml(item.project)}`);
  linhas.push(`scope: ${valorYaml(item.scope)}`);
  linhas.push(`status: ${valorYaml(item.status)}`);
  linhas.push(`epistemic: ${valorYaml(item.epistemic)}`);
  linhas.push(`confidence: ${valorYaml(item.confidence)}`);
  linhas.push(`created: ${valorYaml(item.created)}`);
  linhas.push(`updated: ${valorYaml(item.updated)}`);
  linhas.push(`origem: ${valorYaml(item.origem)}`);
  linhas.push(`source: ${valorYaml(item.source)}`);
  linhas.push(`related: [${(item.related ?? []).join(", ")}]`);
  linhas.push(`supersedes: [${(item.supersedes ?? []).join(", ")}]`);
  linhas.push("---");
  linhas.push("");
  linhas.push(`# ${item.title}`);
  linhas.push("");
  linhas.push(item.body.trim());
  linhas.push("");

  return linhas.join("\n");
}

/** Inverso de `renderizarMarkdown`. O teste de ida e volta usa os dois. */
export function lerItemCanonico(
  texto: string,
): Omit<ItemCanonico, "origem"> & { origem: string } {
  const { meta, corpo } = lerFrontmatter(texto);
  const comoTexto = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : "";
  const comoLista = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v : [];

  const titulo = tituloDoCorpo(corpo);
  const semTitulo = corpo.replace(/^#\s.*\n?/, "").trim();

  return {
    id: comoTexto(meta.id),
    type: comoTexto(meta.type),
    project: comoTexto(meta.project),
    scope: comoTexto(meta.scope),
    status: comoTexto(meta.status),
    epistemic: comoTexto(meta.epistemic),
    confidence: comoTexto(meta.confidence),
    created: comoTexto(meta.created),
    updated: comoTexto(meta.updated),
    source: comoTexto(meta.source),
    origem: comoTexto(meta.origem),
    related: comoLista(meta.related),
    supersedes: comoLista(meta.supersedes),
    title: titulo,
    body: semTitulo,
  };
}

// ── caminho no repositório ──────────────────────────────────────────────────

const PASTA_POR_TIPO: Record<string, string> = {
  decision: "04-memoria/decisoes",
  reasoning: "04-memoria/raciocinio",
  insight: "04-memoria/insights",
  "open-loop": "04-memoria/open-loops",
  "project-state": "03-projetos",
  source: "02-fontes",
};

/**
 * Nome de arquivo a partir do display id e do título.
 *
 * Usa o `slugify` de `lib/slug.ts` de propósito, em vez de repetir a regra
 * aqui: aquela função já tem teste que prova que o intervalo de diacríticos
 * continua escapado — e esse intervalo já se corrompeu duas vezes neste
 * projeto ao ser reescrito à mão.
 */
export function nomeDeArquivo(displayId: string, titulo: string): string {
  const limpo = slugify(titulo);
  return `${displayId.toLowerCase()}-${limpo}.md`;
}

export function caminhoNoRepo(
  tipo: string,
  displayId: string,
  titulo: string,
): string {
  const pasta = PASTA_POR_TIPO[tipo] ?? "04-memoria";
  return `${pasta}/${nomeDeArquivo(displayId, titulo)}`;
}
