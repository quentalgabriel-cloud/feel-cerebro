"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getProjectBySlug } from "@/lib/profile";
import { logEvent } from "@/lib/events";
import { MAX_NEXT, type StateKind } from "@/lib/types";

// Todas as ações abaixo escrevem sob RLS. O banco também impõe NOW = 1
// (índice único parcial) e NEXT <= 3 (check constraint), então uma corrida
// entre duas pessoas não produz estado inválido — no pior caso uma das
// escritas falha, e isso é o comportamento correto.

async function contexto(slug: string) {
  const profile = await ensureProfile();
  const project = await getProjectBySlug(slug);
  if (!profile || !project) return null;
  return { profile, project, supabase: await createClient() };
}

export async function setObjective(slug: string, formData: FormData) {
  const ctx = await contexto(slug);
  if (!ctx) return;

  const objective = String(formData.get("objective") ?? "").trim();

  await ctx.supabase
    .from("project_state")
    .update({ objective: objective || null, updated_by: ctx.profile.id })
    .eq("project_id", ctx.project.id);

  await logEvent(ctx.project.id, "project_state.updated", ctx.profile.id, {
    objective,
  });
  revalidatePath(`/p/${slug}/now`);
}

export async function addItem(slug: string, kind: StateKind, formData: FormData) {
  const ctx = await contexto(slug);
  if (!ctx) return;

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const { data: existentes } = await ctx.supabase
    .from("state_items")
    .select("position")
    .eq("project_id", ctx.project.id)
    .eq("kind", kind)
    .order("position", { ascending: false })
    .limit(1);

  const proxima = (existentes?.[0]?.position ?? 0) + 1;

  // NEXT tem teto. Não é validação cosmética: o banco recusa a quarta linha,
  // então a UI avisa antes em vez de mostrar um erro cru.
  if (kind === "next" && proxima > MAX_NEXT) return;
  if (kind === "now" && proxima > 1) return;

  await ctx.supabase.from("state_items").insert({
    project_id: ctx.project.id,
    kind,
    content,
    position: proxima,
    created_by: ctx.profile.id,
  });

  await logEvent(ctx.project.id, "state_item.added", ctx.profile.id, {
    kind,
    content,
  });
  revalidatePath(`/p/${slug}/now`);
}

export async function removeItem(slug: string, id: string) {
  const ctx = await contexto(slug);
  if (!ctx) return;

  const { data: item } = await ctx.supabase
    .from("state_items")
    .select("kind, content, position")
    .eq("id", id)
    .maybeSingle();

  await ctx.supabase.from("state_items").delete().eq("id", id);

  if (item) {
    // Reaperta as posições restantes: buracos na sequência quebrariam a
    // regra de posição por tipo na próxima inserção.
    const { data: restantes } = await ctx.supabase
      .from("state_items")
      .select("id, position")
      .eq("project_id", ctx.project.id)
      .eq("kind", item.kind)
      .order("position", { ascending: true });

    let pos = 1;
    for (const r of restantes ?? []) {
      if (r.position !== pos) {
        await ctx.supabase
          .from("state_items")
          .update({ position: pos })
          .eq("id", r.id);
      }
      pos += 1;
    }

    await logEvent(ctx.project.id, "state_item.removed", ctx.profile.id, {
      kind: item.kind,
      content: item.content,
    });
  }

  revalidatePath(`/p/${slug}/now`);
}

// NOT NOW → NEXT. É a passagem que dá sentido ao NOT NOW: guardar uma
// possibilidade sem inflar o escopo, e trazê-la de volta quando for a hora.
export async function promoteToNext(slug: string, id: string) {
  const ctx = await contexto(slug);
  if (!ctx) return;

  const { data: item } = await ctx.supabase
    .from("state_items")
    .select("content, kind")
    .eq("id", id)
    .maybeSingle();

  if (!item || item.kind !== "not_now") return;

  const { count } = await ctx.supabase
    .from("state_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", ctx.project.id)
    .eq("kind", "next");

  if ((count ?? 0) >= MAX_NEXT) return;

  await ctx.supabase
    .from("state_items")
    .update({ kind: "next", position: (count ?? 0) + 1 })
    .eq("id", id);

  await logEvent(ctx.project.id, "state_item.promoted", ctx.profile.id, {
    content: item.content,
  });
  revalidatePath(`/p/${slug}/now`);
}
