"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getProjectBySlug } from "@/lib/profile";
import { logEvent } from "@/lib/events";
import { type Project, type Profile, type StateKind } from "@/lib/types";
import { fail, ok, MSG, type ActionResult } from "@/lib/action-result";
import {
  cabeMaisUm,
  conteudoValido,
  mensagemDeLimite,
  proximaPosicao,
  reordenacaoNecessaria,
} from "@/lib/state-rules";

// Todas as ações abaixo escrevem sob RLS. O banco também impõe NOW = 1
// (índice único parcial) e NEXT <= 3 (check constraint), então uma corrida
// entre duas pessoas não produz estado inválido — no pior caso uma das
// escritas falha, e isso é o comportamento correto. O que muda desde
// 2026-09-03: quando falha, a pessoa fica sabendo (ver lib/action-result.ts).

type Contexto =
  | { ok: false; erro: string }
  | {
      ok: true;
      profile: Profile;
      project: Project;
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

async function contexto(slug: string): Promise<Contexto> {
  const profile = await ensureProfile();
  if (!profile) return { ok: false, erro: MSG.sessao };

  const project = await getProjectBySlug(slug);
  if (!project) return { ok: false, erro: MSG.projetoNaoEncontrado };

  return { ok: true, profile, project, supabase: await createClient() };
}

export async function setObjective(
  slug: string,
  _estado: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await contexto(slug);
  if (!ctx.ok) return fail(ctx.erro);

  const objective = String(formData.get("objective") ?? "").trim();

  const { error } = await ctx.supabase
    .from("project_state")
    .update({ objective: objective || null, updated_by: ctx.profile.id })
    .eq("project_id", ctx.project.id);

  if (error) {
    console.error("setObjective: falha ao atualizar project_state", error);
    return fail(MSG.escrita);
  }

  await logEvent(ctx.project.id, "project_state.updated", ctx.profile.id, {
    objective,
  });
  revalidatePath(`/p/${slug}/now`);
  return ok;
}

export async function addItem(
  slug: string,
  kind: StateKind,
  _estado: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await contexto(slug);
  if (!ctx.ok) return fail(ctx.erro);

  const content = String(formData.get("content") ?? "");
  if (!conteudoValido(content)) return fail("Escreva alguma coisa antes de salvar.");

  const { data: existentes, error: leitura } = await ctx.supabase
    .from("state_items")
    .select("position")
    .eq("project_id", ctx.project.id)
    .eq("kind", kind);

  if (leitura) {
    console.error("addItem: falha ao ler posições", leitura);
    return fail(MSG.leitura);
  }

  const posicoes = (existentes ?? []).map((i) => i.position as number);

  // O teto é imposto pelo banco; aqui só antecipamos para dar mensagem
  // legível em vez de um erro de constraint.
  if (!cabeMaisUm(kind, posicoes.length)) return fail(mensagemDeLimite(kind));

  const { error } = await ctx.supabase.from("state_items").insert({
    project_id: ctx.project.id,
    kind,
    content: content.trim(),
    position: proximaPosicao(posicoes),
    created_by: ctx.profile.id,
  });

  if (error) {
    console.error("addItem: falha ao inserir state_item", error);
    return fail(MSG.escrita);
  }

  await logEvent(ctx.project.id, "state_item.added", ctx.profile.id, {
    kind,
    content: content.trim(),
  });
  revalidatePath(`/p/${slug}/now`);
  return ok;
}

export async function removeItem(
  slug: string,
  id: string,
  _estado: ActionResult,
): Promise<ActionResult> {
  const ctx = await contexto(slug);
  if (!ctx.ok) return fail(ctx.erro);

  const { data: item } = await ctx.supabase
    .from("state_items")
    .select("kind, content, position")
    .eq("id", id)
    .maybeSingle();

  const { error } = await ctx.supabase.from("state_items").delete().eq("id", id);

  if (error) {
    console.error("removeItem: falha ao remover state_item", error);
    return fail(MSG.escrita);
  }

  if (item) {
    // Reaperta as posições restantes: buracos na sequência quebrariam a
    // regra de posição por tipo na próxima inserção.
    const { data: restantes } = await ctx.supabase
      .from("state_items")
      .select("id, position")
      .eq("project_id", ctx.project.id)
      .eq("kind", item.kind)
      .order("position", { ascending: true });

    for (const mudanca of reordenacaoNecessaria(
      (restantes ?? []) as { id: string; position: number }[],
    )) {
      await ctx.supabase
        .from("state_items")
        .update({ position: mudanca.position })
        .eq("id", mudanca.id);
    }

    await logEvent(ctx.project.id, "state_item.removed", ctx.profile.id, {
      kind: item.kind,
      content: item.content,
    });
  }

  revalidatePath(`/p/${slug}/now`);
  return ok;
}

// NOT NOW → NEXT. É a passagem que dá sentido ao NOT NOW: guardar uma
// possibilidade sem inflar o escopo, e trazê-la de volta quando for a hora.
export async function promoteToNext(
  slug: string,
  id: string,
  _estado: ActionResult,
): Promise<ActionResult> {
  const ctx = await contexto(slug);
  if (!ctx.ok) return fail(ctx.erro);

  const { data: item } = await ctx.supabase
    .from("state_items")
    .select("content, kind")
    .eq("id", id)
    .maybeSingle();

  if (!item) return fail("Este item não existe mais.");
  if (item.kind !== "not_now") return fail("Só dá para promover um item de NOT NOW.");

  const { count } = await ctx.supabase
    .from("state_items")
    .select("id", { count: "exact", head: true })
    .eq("project_id", ctx.project.id)
    .eq("kind", "next");

  const quantosNext = count ?? 0;
  if (!cabeMaisUm("next", quantosNext)) return fail(mensagemDeLimite("next"));

  const { error } = await ctx.supabase
    .from("state_items")
    .update({ kind: "next", position: quantosNext + 1 })
    .eq("id", id);

  if (error) {
    console.error("promoteToNext: falha ao promover", error);
    return fail(MSG.escrita);
  }

  await logEvent(ctx.project.id, "state_item.promoted", ctx.profile.id, {
    content: item.content,
  });
  revalidatePath(`/p/${slug}/now`);
  return ok;
}
