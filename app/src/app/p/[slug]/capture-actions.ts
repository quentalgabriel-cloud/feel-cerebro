"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";
import { logEvent } from "@/lib/events";

// Heurística de título: primeira linha não vazia. Nunca decide sozinha, só
// sugere — quem promove (Fase 03) confirma ou troca.
function tituloSugerido(texto: string): string | null {
  const linha = texto
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  return linha ? linha.slice(0, 120) : null;
}

export async function captureText(projectId: string, texto: string) {
  const profile = await ensureProfile();
  if (!profile || !texto.trim()) return;

  const supabase = await createClient();

  const { error } = await supabase.from("candidates").insert({
    project_id: projectId,
    author_id: profile.id,
    origin_type: "pasted",
    raw_text: texto,
    suggested_title: tituloSugerido(texto),
    status: "ready_for_review",
  });

  if (error) return;

  await logEvent(projectId, "candidate.created", profile.id, {
    content: tituloSugerido(texto),
  });
}
