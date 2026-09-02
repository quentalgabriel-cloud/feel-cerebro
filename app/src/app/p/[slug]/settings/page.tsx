import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/profile";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
        Ajustes
      </h1>
      <dl className="flex flex-col gap-4 text-sm">
        <div>
          <dt className="text-xs text-neutral-400">Nome</dt>
          <dd>{project.name}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-400">O que estamos construindo</dt>
          <dd className="text-neutral-600">{project.what_building ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-400">Por que precisa existir</dt>
          <dd className="text-neutral-600">{project.why_exists ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-400">Criado em</dt>
          <dd className="text-neutral-600">
            {new Date(project.created_at).toLocaleDateString("pt-BR")}
          </dd>
        </div>
      </dl>
    </main>
  );
}
