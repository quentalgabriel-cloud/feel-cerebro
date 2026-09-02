"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";
import { slugify } from "@/lib/slug";
import { logEvent } from "@/lib/events";
import { fail, MSG, type ActionResult } from "@/lib/action-result";

// Server Actions são alcançáveis por POST direto, não só pela UI (doc do
// Next 16, "Mutating Data"). Aqui a autorização não depende desta função
// lembrar de checar: toda escrita passa por RLS, que só libera membro da
// organização. O `ensureProfile` garante autoria, não permissão.
//
// A assinatura começa com `estado` porque o formulário usa `useActionState`
// (ver components/action-form.tsx). O valor anterior não é usado — o que
// importa é o retorno, que é o que a pessoa vê quando algo falha.
export async function createProject(
  _estado: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await ensureProfile();
  if (!profile) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const whatBuilding = String(formData.get("what_building") ?? "").trim();
  const whyExists = String(formData.get("why_exists") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();

  if (!name) return fail("O projeto precisa de um nome.");

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    // Não devia acontecer mais — `ensureProfile()` já garante organização.
    // Se aparecer nos logs, o bug de 2026-09-02 voltou (ver lib/profile.ts).
    console.error("createProject: profile sem organization_members", profile.id);
    return fail(MSG.semOrganizacao);
  }

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

  if (error || !project) {
    console.error("createProject: falha ao inserir project", error);
    return fail(MSG.escrita);
  }

  // Projeto e estado inicial nascem juntos: um projeto sem `project_state` é
  // um estado que a UI teria que tratar como exceção para sempre.
  const { error: stateError } = await supabase.from("project_state").insert({
    project_id: project.id,
    objective: objective || null,
    updated_by: profile.id,
  });

  if (stateError) {
    // O projeto existe e é utilizável; só o objetivo inicial não gravou.
    // Falhar a criação inteira aqui seria pior — a pessoa perderia o resto.
    console.error("createProject: project_state não gravou", stateError);
  }

  await logEvent(project.id, "project.created", profile.id, { name });

  revalidatePath("/projects");
  // `redirect()` lança — o tipo de retorno é `never`, então o caminho de
  // sucesso não precisa (nem consegue) devolver ActionResult.
  redirect(`/p/${project.slug}/now`);
}
