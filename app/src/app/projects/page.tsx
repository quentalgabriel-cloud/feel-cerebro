import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";
import { ActionForm } from "@/components/action-form";
import { DataError } from "@/components/data-error";
import { createProject } from "./actions";
import type { Project } from "@/lib/types";

export default async function ProjectsPage() {
  const profile = await ensureProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const lista = (projects ?? []) as Project[];

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Olá, {profile.name}.
        </p>
      </header>

      {/* Erro de leitura não pode virar "você não tem projetos". */}
      {error && (
        <div className="mb-8">
          <DataError contexto="seus projetos" />
        </div>
      )}

      {lista.length > 0 && (
        <ul className="mb-12 flex flex-col gap-2">
          {lista.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${p.slug}/now`}
                className="block rounded-lg border border-neutral-200 px-4 py-3 transition hover:border-neutral-400"
              >
                <span className="text-sm font-medium">{p.name}</span>
                {p.what_building && (
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    {p.what_building}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-lg border border-dashed border-neutral-300 p-6">
        <h2 className="text-sm font-semibold">
          {lista.length === 0 && !error
            ? "Comece pelo primeiro projeto"
            : "Novo projeto"}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Duas perguntas bastam para começar. O resto vem com o uso.
        </p>

        <div className="mt-5">
          <ActionForm action={createProject} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Nome</span>
              <input
                name="name"
                required
                placeholder="Feel"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">O que estamos construindo?</span>
              <textarea
                name="what_building"
                rows={2}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Por que isso precisa existir?</span>
              <textarea
                name="why_exists"
                rows={2}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">
                Objetivo atual{" "}
                <span className="font-normal text-neutral-400">(opcional)</span>
              </span>
              <input
                name="objective"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </label>

            <button
              type="submit"
              className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              Criar projeto
            </button>
          </ActionForm>
        </div>
      </section>
    </main>
  );
}
