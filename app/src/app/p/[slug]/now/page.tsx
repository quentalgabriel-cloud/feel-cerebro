import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug } from "@/lib/profile";
import { EVENT_LABEL } from "@/lib/events";
import { ActionForm } from "@/components/action-form";
import { DataError } from "@/components/data-error";
import { MAX_NEXT, type ProjectEvent, type ProjectState, type StateItem } from "@/lib/types";
import { addItem, promoteToNext, removeItem, setObjective } from "./actions";

export default async function NowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const supabase = await createClient();

  const [
    { data: estado },
    { data: itens, error: erroItens },
    { data: eventos, error: erroEventos },
  ] = await Promise.all([
    supabase.from("project_state").select("*").eq("project_id", project.id).maybeSingle(),
    supabase
      .from("state_items")
      .select("*")
      .eq("project_id", project.id)
      .order("position", { ascending: true }),
    supabase
      .from("events")
      .select("*, profiles(name)")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const state = estado as ProjectState | null;
  const todos = (itens ?? []) as StateItem[];
  const now = todos.find((i) => i.kind === "now");
  const next = todos.filter((i) => i.kind === "next");
  const notNow = todos.filter((i) => i.kind === "not_now");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      {/* Objetivo — o "para quê" que dá sentido ao resto da tela */}
      <section className="mb-10">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Objetivo
        </h2>
        <ActionForm action={setObjective.bind(null, slug)} className="flex gap-2">
          <input
            name="objective"
            defaultValue={state?.objective ?? ""}
            placeholder="O que este projeto precisa alcançar agora"
            className="flex-1 rounded-md border border-transparent bg-neutral-50 px-3 py-2 text-base outline-none transition focus:border-neutral-300 focus:bg-white"
          />
          <button
            type="submit"
            className="rounded-md px-3 py-2 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            Salvar
          </button>
        </ActionForm>
      </section>

      {/* Leitura falhou: não dá para mostrar NOW/NEXT/NOT NOW vazios como se
          fossem o estado real — quem visse isso definiria um segundo NOW. */}
      {erroItens && (
        <div className="mb-10">
          <DataError contexto="o estado deste projeto" />
        </div>
      )}

      {/* NOW — um, e só um */}
      {!erroItens && (
      <section className="mb-10">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Now
        </h2>
        {now ? (
          <div className="flex items-start gap-3 rounded-lg border-l-2 border-neutral-900 bg-neutral-50 px-4 py-3">
            <p className="flex-1 text-base leading-relaxed">{now.content}</p>
            <ActionForm action={removeItem.bind(null, slug, now.id)}>
              <button className="text-xs text-neutral-400 transition hover:text-neutral-900">
                concluir
              </button>
            </ActionForm>
          </div>
        ) : (
          <ActionForm action={addItem.bind(null, slug, "now")} className="flex gap-2">
            <input
              name="content"
              required
              placeholder="A única coisa em andamento agora"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
            <button className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-700">
              Definir
            </button>
          </ActionForm>
        )}
      </section>

      )}

      {/* O que mudou — determinístico, a partir de events */}
      <section className="mb-10">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          O que mudou
        </h2>
        {eventos && eventos.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {(eventos as (ProjectEvent & { profiles: { name: string } | null })[]).map(
              (e) => (
                <li key={e.id} className="flex gap-2 text-xs text-neutral-500">
                  <span className="tabular-nums text-neutral-400">
                    {new Date(e.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  <span>
                    <strong className="font-medium text-neutral-700">
                      {e.profiles?.name ?? "alguém"}
                    </strong>{" "}
                    {EVENT_LABEL[e.type] ?? e.type}
                    {typeof e.payload?.content === "string" && (
                      <span className="text-neutral-400">
                        {" "}
                        — {String(e.payload.content).slice(0, 60)}
                      </span>
                    )}
                  </span>
                </li>
              ),
            )}
          </ul>
        ) : erroEventos ? (
          <DataError contexto="o histórico" />
        ) : (
          <p className="text-xs text-neutral-400">
            Nada ainda. O histórico começa no primeiro movimento.
          </p>
        )}
      </section>

      {/* NEXT — no máximo três */}
      {!erroItens && (
      <section className="mb-10">
        <h2 className="mb-2 flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Next
          <span className="font-normal normal-case tracking-normal">
            {next.length}/{MAX_NEXT}
          </span>
        </h2>
        <ul className="mb-3 flex flex-col gap-1.5">
          {next.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-md border border-neutral-200 px-3 py-2"
            >
              <span className="flex-1 text-sm">{item.content}</span>
              <ActionForm action={removeItem.bind(null, slug, item.id)}>
                <button className="text-xs text-neutral-400 transition hover:text-neutral-900">
                  remover
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
        {next.length < MAX_NEXT ? (
          <ActionForm action={addItem.bind(null, slug, "next")} className="flex gap-2">
            <input
              name="content"
              required
              placeholder="Próximo passo"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
            <button className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-medium transition hover:border-neutral-900">
              Adicionar
            </button>
          </ActionForm>
        ) : (
          <p className="text-xs text-neutral-400">
            Três é o teto. Para adicionar outro, conclua ou remova um.
          </p>
        )}
      </section>

      )}

      {/* NOT NOW — guardar sem inflar o escopo */}
      {!erroItens && (
      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Not now
        </h2>
        <ul className="mb-3 flex flex-col gap-1.5">
          {notNow.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-md px-3 py-1.5 text-neutral-500"
            >
              <span className="flex-1 text-sm">{item.content}</span>
              <ActionForm action={promoteToNext.bind(null, slug, item.id)}>
                <button className="text-xs text-neutral-400 transition hover:text-neutral-900">
                  → next
                </button>
              </ActionForm>
              <ActionForm action={removeItem.bind(null, slug, item.id)}>
                <button className="text-xs text-neutral-400 transition hover:text-neutral-900">
                  descartar
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
        <ActionForm action={addItem.bind(null, slug, "not_now")} className="flex gap-2">
          <input
            name="content"
            required
            placeholder="Boa ideia, hora errada"
            className="flex-1 rounded-md border border-transparent bg-neutral-50 px-3 py-2 text-sm outline-none transition focus:border-neutral-300 focus:bg-white"
          />
          <button className="rounded-md px-3 py-2 text-xs text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900">
            Guardar
          </button>
        </ActionForm>
      </section>
      )}
    </main>
  );
}
