#!/usr/bin/env node
/**
 * reindex.mjs — reconstrói `knowledge_index` a partir do Markdown no Git.
 *
 * ESTE SCRIPT É O TESTE DA DEC-013, não um utilitário.
 *
 * A decisão diz: o Git é autoridade do conhecimento canônico, e o índice no
 * Postgres é DERIVADO e 100% reconstruível. A única prova disso é apagar o
 * índice e reconstruí-lo do zero, duas vezes, e obter o mesmo resultado. Se
 * um dia isso deixar de valer, o Git parou de ser autoridade e o defeito é
 * do índice — nunca o contrário.
 *
 * Por isso o script é destrutivo por natureza (apaga o índice do projeto
 * antes de reconstruir) e NÃO tem modo incremental: incremental esconde
 * divergência, que é exatamente o que ele existe para detectar.
 *
 * Autentica com email e senha, como uma pessoa — não com service role. Duas
 * razões: nenhum segredo novo entra no sistema, e a escrita passa pela RLS
 * de verdade, então rodar isto também é um teste das policies.
 *
 * Uso:
 *   node scripts/reindex.mjs --repo <caminho> --nome <owner/repo> --projeto <slug>
 *
 * Variáveis:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, CEREBRO_EMAIL,
 *   CEREBRO_SENHA
 */

import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

// ── argumentos ──────────────────────────────────────────────────────────────
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
}
const RAIZ = args.repo;
const REPO = args.nome;
const PROJETO = args.projeto;

if (!RAIZ || !REPO || !PROJETO) {
  console.error("uso: node scripts/reindex.mjs --repo <caminho> --nome <owner/repo> --projeto <slug>");
  process.exit(1);
}

// ── frontmatter ─────────────────────────────────────────────────────────────
// Parser deliberadamente pequeno: só o subconjunto de YAML que o SCHEMA.md do
// vault usa (chave: valor, e listas em [a, b]). Uma dependência de YAML aqui
// seria uma dependência a mais para ler arquivo que nós mesmos escrevemos.
function lerFrontmatter(texto) {
  if (!texto.startsWith("---")) return { meta: {}, corpo: texto };
  const fim = texto.indexOf("\n---", 3);
  if (fim === -1) return { meta: {}, corpo: texto };

  const bruto = texto.slice(3, fim).trim();
  const corpo = texto.slice(fim + 4).trim();
  const meta = {};

  for (const linha of bruto.split("\n")) {
    const sep = linha.indexOf(":");
    if (sep === -1) continue;
    const chave = linha.slice(0, sep).trim();
    let valor = linha.slice(sep + 1).trim();
    if (!chave || chave.startsWith("#")) continue;
    valor = valor.replace(/^["']|["']$/g, "");
    meta[chave] = valor;
  }
  return { meta, corpo };
}

// O `type` do frontmatter é a autoridade. Quando falta, o caminho dá a pista —
// mas isso vira `origem: ai-inferido`, porque é inferência nossa, não algo que
// o arquivo afirma.
const PASTA_TIPO = [
  ["decisoes", "decision"],
  ["decisions", "decision"],
  ["raciocinio", "reasoning"],
  ["reasoning", "reasoning"],
  ["insights", "insight"],
  ["open-loops", "open-loop"],
  ["loops", "open-loop"],
  ["fontes", "source"],
  ["sources", "source"],
  ["permanent", "insight"],
];

const TIPOS = new Set([
  "decision", "reasoning", "insight", "open-loop", "project-state", "source",
]);

function inferirTipo(caminhoRelativo) {
  const partes = caminhoRelativo.split(sep).map((p) => p.toLowerCase());
  for (const [pasta, tipo] of PASTA_TIPO) {
    if (partes.includes(pasta)) return tipo;
  }
  return null;
}

function primeiroTitulo(corpo, alternativa) {
  const h1 = corpo.split("\n").find((l) => l.startsWith("# "));
  return h1 ? h1.slice(2).trim() : alternativa;
}

function dataValida(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

// ── varredura ───────────────────────────────────────────────────────────────
const IGNORAR = new Set([".git", "node_modules", ".obsidian", ".claude", ".agents", ".codex", ".next", ".cerebro"]);

async function varrer(dir) {
  const achados = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) achados.push(...(await varrer(caminho)));
    else if (entrada.name.endsWith(".md")) achados.push(caminho);
  }
  return achados;
}

// ── principal ───────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const { error: erroLogin } = await supabase.auth.signInWithPassword({
  email: process.env.CEREBRO_EMAIL,
  password: process.env.CEREBRO_SENHA,
});
if (erroLogin) {
  console.error("login falhou:", erroLogin.message);
  process.exit(1);
}

const { data: projeto, error: erroProjeto } = await supabase
  .from("projects").select("id, name").eq("slug", PROJETO).maybeSingle();

if (erroProjeto || !projeto) {
  console.error(`projeto "${PROJETO}" não encontrado (ou sem acesso).`);
  process.exit(1);
}

const arquivos = await varrer(RAIZ);
const itens = [];
let semTipo = 0;

for (const caminho of arquivos) {
  const rel = relative(RAIZ, caminho).split(sep).join("/");
  const texto = await readFile(caminho, "utf8");
  const { meta, corpo } = lerFrontmatter(texto);

  const doFrontmatter = TIPOS.has(meta.type) ? meta.type : null;
  const inferido = inferirTipo(relative(RAIZ, caminho));
  const tipo = doFrontmatter ?? inferido;

  // Sem tipo declarado nem inferível, o arquivo não é conhecimento tipado —
  // é texto solto. Fica de fora do índice em vez de entrar como "outro".
  if (!tipo) { semTipo += 1; continue; }

  itens.push({
    project_id: projeto.id,
    display_id: meta.id || rel.replace(/\.md$/, ""),
    type: tipo,
    scope: meta.scope || "pessoal",
    status: meta.status || "ativa",
    epistemic: meta.epistemic || null,
    confidence: meta.confidence || null,
    title: primeiroTitulo(corpo, rel.replace(/\.md$/, "")),
    created_at_md: dataValida(meta.created),
    updated_at_md: dataValida(meta.updated),
    source_ref: meta.source || null,
    repo: REPO,
    path: rel,
    body: corpo.slice(0, 20000),
    // Se o próprio arquivo declara o tipo, quem afirmou foi o Gabriel.
    // Se fomos nós que deduzimos pela pasta, isso é inferência — e fica dito.
    origem: meta.origem || (doFrontmatter ? "gabriel-afirmou" : "ai-inferido"),
  });
}

// Reconstrução do zero. Não é `upsert` incremental de propósito: o que este
// script prova é que o índice inteiro renasce do Git.
const { error: erroLimpeza } = await supabase
  .from("knowledge_index").delete().eq("project_id", projeto.id).eq("repo", REPO);
if (erroLimpeza) {
  console.error("falha ao limpar o índice:", erroLimpeza.message);
  process.exit(1);
}

const { error: erroInsercao, count } = await supabase
  .from("knowledge_index").insert(itens, { count: "exact" });
if (erroInsercao) {
  console.error("falha ao indexar:", erroInsercao.message);
  process.exit(1);
}

const porTipo = itens.reduce((acc, i) => ({ ...acc, [i.type]: (acc[i.type] ?? 0) + 1 }), {});
const inferidos = itens.filter((i) => i.origem === "ai-inferido").length;

console.log(`projeto:    ${projeto.name} (${PROJETO})`);
console.log(`repo:       ${REPO}`);
console.log(`markdown:   ${arquivos.length} arquivos`);
console.log(`indexados:  ${count ?? itens.length}`);
console.log(`ignorados:  ${semTipo} (sem tipo declarado nem inferível)`);
console.log(`por tipo:   ${Object.entries(porTipo).map(([t, n]) => `${t}=${n}`).join("  ")}`);
console.log(`ai-inferido: ${inferidos} de ${itens.length}`);
