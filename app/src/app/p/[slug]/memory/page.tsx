import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/profile";
import type { Candidate } from "@/lib/types";

export default async function MemoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select("*, profiles(name)")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const candidatos = (data ?? []) as (Candidate & {
    profiles: { name: string } | null;
  })[];

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Memory
        </h1>
        <span className="text-xs text-neutral-400">
          {candidatos.length} {candidatos.length === 1 ? "captura" : "capturas"}
        </span>
      </div>

      {/* A distinção que o sistema inteiro existe para preservar: isto ainda
          não é conhecimento. É material bruto esperando decisão humana. */}
      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-900">
          Tudo abaixo é <strong>captura, não conhecimento canônico</strong>.
          Nada aqui foi revisado, classificado ou promovido — a promoção para
          memória durável em Markdown versionado entra na Fase 03.
        </p>
      </div>

      {candidatos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-500">
            Nada capturado ainda. Use <kbd className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">⌘K</kbd>{" "}
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
              {c.raw_text && (
                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                  {c.raw_text}
                </p>
              )}
              <p className="mt-2 text-[11px] text-neutral-400">
                {c.profiles?.name ?? "—"} ·{" "}
                {new Date(c.created_at).toLocaleString("pt-BR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
