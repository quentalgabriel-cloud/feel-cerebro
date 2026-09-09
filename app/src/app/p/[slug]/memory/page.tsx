import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getProjectBySlug } from "@/lib/profile";
import { DataError } from "@/components/data-error";
import { PromoteForm } from "@/components/promote-form";
import { UploadForm } from "@/components/upload-form";
import { promoverCandidate, registrarUpload } from "./actions";
import {
  KNOWLEDGE_LABEL,
  type Candidate,
  type KnowledgeItem,
  type KnowledgeType,
} from "@/lib/types";

// MEMORY mostra duas coisas que o sistema inteiro existe para não confundir:
//
//   CONHECIMENTO — Markdown versionado no Git, tipado, com proveniência. O que
//   está aqui foi decidido. Esta tela é uma projeção; o Git é a autoridade.
//
//   CAPTURA — o que entrou e ainda não foi decidido. Não é conhecimento, e a
//   tela diz isso na cara em vez de deixar a pessoa supor.
//
// A fronteira entre as duas é a DEC-006 do vault: captura é barata e
// automática, promoção é cara e seletiva. Uma tela que misturasse as duas
// apagaria a distinção que dá valor ao acervo.

const TIPOS: KnowledgeType[] = [
  "decision",
  "reasoning",
  "insight",
  "open-loop",
  "project-state",
  "source",
];

export default async function MemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const { slug } = await params;
  const { q, tipo } = await searchParams;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const profile = await ensureProfile();
  if (!profile) notFound();

  const supabase = await createClient();

  let consulta = supabase
    .from("knowledge_index")
    .select("*")
    .eq("project_id", project.id);

  if (tipo && TIPOS.includes(tipo as KnowledgeType)) {
    consulta = consulta.eq("type", tipo);
  }
  if (q?.trim()) {
    // `websearch` aceita o que uma pessoa digita — aspas, OR, palavra solta —
    // sem exigir sintaxe de tsquery. A coluna `busca` é gerada pelo banco
    // (migration 0007), então nunca fica desatualizada.
    consulta = consulta.textSearch("busca", q.trim(), {
      type: "websearch",
      config: "portuguese",
    });
  }

  const [
    { data: conhecimento, error: erroConhecimento },
    { data: capturas, error: erroCapturas },
    { data: promocoes },
  ] = await Promise.all([
    consulta.order("display_id", { ascending: true }).limit(200),
    supabase
      .from("candidates")
      .select("*, profiles(name)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("promotions")
      .select("candidate_id, display_id, status, erro")
      .eq("project_id", project.id),
  ]);

  // Estado da promoção por captura. Uma captura pedida e ainda não aplicada
  // NÃO é conhecimento — a tela diz isso, em vez de deixar parecer que já foi.
  const pedido = new Map(
    (promocoes ?? []).map((p) => [
      p.candidate_id as string,
      p as { display_id: string; status: string; erro: string | null },
    ]),
  );

  const itens = (conhecimento ?? []) as KnowledgeItem[];
  const candidatos = (capturas ?? []) as (Candidate & {
    profiles: { name: string } | null;
  })[];

  const base = `/p/${slug}/memory`;
  const comFiltro = (t?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (t) p.set("tipo", t);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };

  const inferidos = itens.filter((i) => i.origem === "ai-inferido").length;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      {/* ── CONHECIMENTO ──────────────────────────────────────────────── */}
      <section className="mb-14">
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
            Conhecimento
          </h1>
          <span className="text-xs text-neutral-400">
            {itens.length} {itens.length === 1 ? "item" : "itens"}
          </span>
        </div>

        <form action={base} className="mb-3 flex gap-2">
          {tipo && <input type="hidden" name="tipo" value={tipo} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar no que já foi decidido"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <button className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium transition hover:border-neutral-900">
            Buscar
          </button>
        </form>

        <div className="mb-5 flex flex-wrap gap-1.5">
          <Link
            href={comFiltro()}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
              !tipo
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
            }`}
          >
            tudo
          </Link>
          {TIPOS.map((t) => (
            <Link
              key={t}
              href={comFiltro(t)}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                tipo === t
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-500 hover:border-neutral-400"
              }`}
            >
              {KNOWLEDGE_LABEL[t]}
            </Link>
          ))}
        </div>

        {erroConhecimento ? (
          <DataError contexto="o conhecimento indexado" />
        ) : itens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
            <p className="text-sm text-neutral-500">
              {q || tipo
                ? "Nada encontrado com esse filtro."
                : "Nenhum conhecimento indexado para este projeto ainda."}
            </p>
            {!q && !tipo && (
              <p className="mt-1.5 text-xs text-neutral-400">
                O índice é reconstruído a partir do Markdown no Git —
                <code className="mx-1 rounded bg-neutral-100 px-1">scripts/reindex.mjs</code>.
              </p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {itens.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-neutral-200 px-4 py-3 transition hover:border-neutral-400"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                    {item.display_id}
                  </span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                    {KNOWLEDGE_LABEL[item.type] ?? item.type}
                  </span>
                  {item.epistemic && (
                    <span className="text-[10px] text-neutral-400">
                      {item.epistemic}
                    </span>
                  )}
                  {/* Marcado na cara: isto ninguém afirmou, foi deduzido. */}
                  {item.origem === "ai-inferido" && (
                    <span
                      title="Tipo deduzido pela pasta, não declarado no arquivo"
                      className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800"
                    >
                      inferido
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm font-medium leading-snug">
                  {item.title}
                </p>

                <p className="mt-1.5 font-mono text-[10px] text-neutral-400">
                  {item.repo} · {item.path}
                </p>
              </li>
            ))}
          </ul>
        )}

        {inferidos > 0 && (
          <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">
            {inferidos} {inferidos === 1 ? "item tem" : "itens têm"} tipo
            deduzido pela pasta em vez de declarado no arquivo. Continuam
            marcados como inferidos até alguém confirmar.
          </p>
        )}
      </section>

      {/* ── CAPTURA ───────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
            Captura
          </h2>
          <span className="text-xs text-neutral-400">
            {candidatos.length} {candidatos.length === 1 ? "item" : "itens"}
          </span>
        </div>

        <div className="mb-4">
          <UploadForm
            projectId={project.id}
            profileId={profile.id}
            acao={registrarUpload.bind(null, slug)}
          />
        </div>

        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-900">
            Isto <strong>não é conhecimento</strong>. É material capturado
            esperando decisão — nada aqui foi revisado nem promovido. Captura é
            barata de propósito; virar conhecimento é caro de propósito.
          </p>
        </div>

        {erroCapturas ? (
          <DataError contexto="as capturas" />
        ) : candidatos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center">
            <p className="text-sm text-neutral-500">
              Nada capturado ainda. Use{" "}
              <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">⌘K</kbd>{" "}
              de qualquer tela.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {candidatos.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-neutral-200 px-4 py-3"
              >
                <p className="text-sm font-medium">
                  {c.suggested_title ?? "(sem título)"}
                </p>
                {c.raw_text ? (
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                    {c.raw_text}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-neutral-400">
                    Arquivo guardado íntegro, texto ainda não extraído — não há
                    o que revisar até a extração rodar.
                  </p>
                )}
                <p className="mt-2 text-[11px] text-neutral-400">
                  {c.profiles?.name ?? "—"} ·{" "}
                  {new Date(c.created_at).toLocaleString("pt-BR")}
                </p>

                {(() => {
                  const p = pedido.get(c.id);

                  if (p?.status === "aplicada") {
                    return (
                      <p className="mt-2 text-[11px] text-neutral-500">
                        Promovido como{" "}
                        <span className="font-mono">{p.display_id}</span> — está
                        no Git.
                      </p>
                    );
                  }

                  if (p?.status === "pendente") {
                    return (
                      <p className="mt-2 rounded border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] text-blue-900">
                        Promoção pedida como{" "}
                        <span className="font-mono">{p.display_id}</span>.
                        Ainda <strong>não está no Git</strong> — entra quando o
                        worker aplicar.
                      </p>
                    );
                  }

                  if (p?.status === "falhou") {
                    return (
                      <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-800">
                        A promoção falhou e nada foi escrito no Git.{" "}
                        {p.erro?.slice(0, 140)}
                      </p>
                    );
                  }

                  return (
                    <PromoteForm
                      rascunho={c.raw_text}
                      acao={promoverCandidate.bind(null, slug, c.id)}
                    />
                  );
                })()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
