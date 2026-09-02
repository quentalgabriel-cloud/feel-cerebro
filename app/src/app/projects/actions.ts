"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, slugify } from "@/lib/profile";
import { logEvent } from "@/lib/events";

// Server Actions são alcançáveis por POST direto, não só pela UI (doc do
// Next 16, "Mutating Data"). Aqui a autorização não depende desta função
// lembrar de checar: toda escrita passa por RLS, que só libera membro da
// organização. O `ensureProfile` garante autoria, não permissão.
export async function createProject(formData: FormData) {
  const profile = await ensureProfile();
  if (!profile) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const whatBuilding = String(formData.get("what_building") ?? "").trim();
  const whyExists = String(formData.get("why_exists") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();

  if (!name) return;

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .limit(1)
    .maybeSingle();

  if (!membership) return;

  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      organization_id: membership.organization_id,
      name,
      slug,
      what_building: whatBuilding || null,
      why_exists: whyExists || null,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error || !project) return;

  // Projeto e estado inicial nascem juntos: um projeto sem `project_state` é
  // um estado que a UI teria que tratar como exceção para sempre.
  await supabase.from("project_state").insert({
    project_id: project.id,
    objective: objective || null,
    updated_by: profile.id,
  });

  await logEvent(project.id, "project.created", profile.id, { name });

  revalidatePath("/projects");
  redirect(`/p/${project.slug}/now`);
}
