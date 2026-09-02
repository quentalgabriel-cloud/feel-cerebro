"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";
import { logEvent } from "@/lib/events";
import { fail, ok, MSG, type ActionResult } from "@/lib/action-result";
import { tituloSugerido } from "@/lib/capture-rules";

// Devolve resultado porque o Quick Capture precisa saber se gravou: se
// falhar e a UI limpar o campo mesmo assim, a pessoa perde o que escreveu —
// exatamente o que o requisito de FALHAS da Fase 01 proíbe ("sessão expirada
// → volta ao login sem perder rascunho de captura").
export async function captureText(
  projectId: string,
  texto: string,
): Promise<ActionResult> {
  const profile = await ensureProfile();
  if (!profile) return fail(MSG.sessao);
  if (!texto.trim()) return fail("Não há nada para capturar.");

  const supabase = await createClient();

  const { error } = await supabase.from("candidates").insert({
    project_id: projectId,
    author_id: profile.id,
    origin_type: "pasted",
    raw_text: texto,
    suggested_title: tituloSugerido(texto),
    status: "ready_for_review",
  });

  if (error) {
    console.error("captureText: falha ao inserir candidate", error);
    return fail(MSG.escrita);
  }

  await logEvent(projectId, "candidate.created", profile.id, {
    content: tituloSugerido(texto),
  });

  return ok;
}
