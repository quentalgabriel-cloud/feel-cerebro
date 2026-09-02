import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getProjectBySlug } from "@/lib/profile";
import { QuickCapture } from "@/components/quick-capture";
import type { Project } from "@/lib/types";

const NAV = [
  { seg: "now", label: "NOW" },
  { seg: "work", label: "WORK" },
  { seg: "memory", label: "MEMORY" },
  { seg: "explore", label: "EXPLORE" },
] as const;

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const profile = await ensureProfile();
  if (!profile) redirect("/login");

  const project = await getProjectBySlug(slug);
  // Sem projeto visível: ou não existe, ou a pessoa não é membro. O RLS não
  // distingue os dois casos de propósito — 404 não revela a existência de um
  // projeto de outra organização.
  if (!project) notFound();

  const supabase = await createClient();
  const { data: outros } = await supabase
    .from("projects")
    .select("slug, name")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-6 px-6 py-3">
          <ProjectSwitcher
            atual={project}
            projetos={(outros ?? []) as Pick<Project, "slug" | "name">[]}
          />

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.seg}
                href={`/p/${slug}/${item.seg}`}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium tracking-wide text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <QuickCapture projectId={project.id} />
            <Link
              href={`/p/${slug}/settings`}
              className="rounded-md px-2.5 py-1.5 text-xs text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
            >
              Ajustes
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}

function ProjectSwitcher({
  atual,
  projetos,
}: {
  atual: Project;
  projetos: Pick<Project, "slug" | "name">[];
}) {
  if (projetos.length <= 1) {
    return <span className="text-sm font-semibold">{atual.name}</span>;
  }

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none text-sm font-semibold marker:content-none">
        {atual.name} <span className="text-neutral-400">▾</span>
      </summary>
      <ul className="absolute left-0 top-full z-10 mt-1 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
        {projetos.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/p/${p.slug}/now`}
              className="block px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              {p.name}
            </Link>
          </li>
        ))}
        <li className="mt-1 border-t border-neutral-100 pt-1">
          <Link
            href="/projects"
            className="block px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-50"
          >
            Todos os projetos
          </Link>
        </li>
      </ul>
    </details>
  );
}
