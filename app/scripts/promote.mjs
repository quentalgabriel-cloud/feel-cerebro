#!/usr/bin/env node
/**
 * promote.mjs — aplica as promoções pendentes ao repositório de conhecimento.
 *
 * O app web registra a INTENÇÃO; este worker produz o EFEITO. A separação é o
 * que torna a falha segura possível: enquanto o commit não existir, nada no
 * banco afirma que o candidate foi promovido.
 *
 * A ordem das operações abaixo não é arbitrária — é a única que sobrevive a
 * uma queda no meio:
 *
 *   1. escreve o arquivo e commita     → se falhar, nada mudou no banco
 *   2. empurra para o remoto            → se falhar, o commit é local; o banco
 *                                         continua dizendo "pendente", e a
 *                                         próxima execução tenta de novo
 *   3. marca a promoção como aplicada   → só depois de o commit existir lá
 *   4. marca o candidate como promovido
 *
 * O passo 3 nunca acontece antes do 2. Um acervo que afirma ter promovido algo
 * que não está no Git é pior que uma fila parada.
 *
 * Não escreve em `knowledge_index`: quem indexa é o `reindex.mjs`, e ter um
 * único escritor do índice é o que impede o índice de divergir do Git por
 * construção. Rode o reindex depois — ou deixe que ele rode sozinho.
 *
 * Uso:
 *   node scripts/promote.mjs --repo <caminho-do-clone> --nome <owner/repo>
 */

import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  args[process.argv[i].replace(/^--/, "")] = process.argv[i + 1];
}
const CLONE = args.repo;
const REPO = args.nome;

if (!CLONE || !REPO) {
  console.error("uso: node scripts/promote.mjs --repo <caminho> --nome <owner/repo>");
  process.exit(1);
}

const git = (...argumentos) => exec("git", ["-C", CLONE, ...argumentos]);

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

const { data: pendentes, error: erroFila } = await supabase
  .from("promotions")
  .select("*")
  .eq("status", "pendente")
  .eq("repo", REPO)
  .order("requested_at", { ascending: true });

if (erroFila) {
  console.error("falha ao ler a fila:", erroFila.message);
  process.exit(1);
}

if (!pendentes?.length) {
  console.log(`nada pendente para ${REPO}.`);
  process.exit(0);
}

console.log(`${pendentes.length} promoção(ões) pendente(s) para ${REPO}\n`);

let aplicadas = 0;
let falhas = 0;

for (const p of pendentes) {
  const destino = join(CLONE, p.path);
  console.log(`→ ${p.display_id}  ${p.path}`);

  try {
    // 1. arquivo + commit — local, reversível se algo estourar depois
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, p.markdown, "utf8");

    await git("add", "--", p.path);
    await git(
      "commit",
      "-m",
      `${p.display_id}: promovido do Cérebro\n\n` +
        `Promoção pedida no app web e aplicada por scripts/promote.mjs.\n` +
        `Origem: candidate ${p.candidate_id}.\n`,
    );

    // 2. empurra ANTES de tocar no banco. Se isto falhar, o banco continua
    //    dizendo "pendente" e a próxima execução refaz — o commit local
    //    extra é inofensivo, o push é idempotente.
    await git("push");

    const { stdout: sha } = await git("rev-parse", "HEAD");

    // 3. agora sim: o commit existe no remoto
    const { error: erroPromocao } = await supabase
      .from("promotions")
      .update({
        status: "aplicada",
        commit_sha: sha.trim(),
        applied_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    if (erroPromocao) throw new Error(`banco: ${erroPromocao.message}`);

    // 4. e o candidate deixa de ser captura
    const { error: erroCandidate } = await supabase
      .from("candidates")
      .update({
        status: "promoted",
        promoted_at: new Date().toISOString(),
        promoted_knowledge_id: p.display_id,
      })
      .eq("id", p.candidate_id);
    if (erroCandidate) throw new Error(`banco: ${erroCandidate.message}`);

    console.log(`  aplicada — ${sha.trim().slice(0, 7)}\n`);
    aplicadas += 1;
  } catch (e) {
    const mensagem = e?.stderr?.toString?.() || e?.message || String(e);
    console.error(`  FALHOU: ${mensagem.trim().split("\n")[0]}\n`);

    // Registra a falha sem consumir o pedido: `falhou` é diagnóstico, e o
    // pedido volta para `pendente` numa nova tentativa manual. Não se apaga
    // a intenção da pessoa porque a rede caiu.
    await supabase
      .from("promotions")
      .update({ status: "falhou", erro: mensagem.slice(0, 2000) })
      .eq("id", p.id);

    falhas += 1;
  }
}

console.log(`aplicadas: ${aplicadas}   falhas: ${falhas}`);
console.log(
  falhas === 0
    ? "rode agora o reindex — ele é quem atualiza o índice."
    : "corrija a causa e rode de novo; os pedidos que falharam estão marcados.",
);
process.exit(falhas === 0 ? 0 : 1);
