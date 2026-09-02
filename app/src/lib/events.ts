import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/lib/types";

// Log append-only. Não é event sourcing: o estado vive nas suas próprias
// tabelas e é a verdade; isto é o registro do que mudou, que a Fase 02 usa
// para montar "What Changed" e o Resume.
//
// Falha de escrita de evento nunca derruba a ação principal — perder uma
// linha de histórico é ruim, impedir alguém de mexer no NOW é pior.
export async function logEvent(
  projectId: string,
  type: EventType,
  actorId: string | null,
  payload: Record<string, unknown> = {},
) {
  try {
    const supabase = await createClient();
    await supabase.from("events").insert({
      project_id: projectId,
      type,
      actor_id: actorId,
      payload,
    });
  } catch {
    // silencioso por design — ver comentário acima
  }
}

export const EVENT_LABEL: Record<EventType, string> = {
  "project.created": "criou o projeto",
  "project_state.updated": "mudou o objetivo",
  "state_item.added": "adicionou",
  "state_item.removed": "removeu",
  "state_item.promoted": "promoveu para NEXT",
  "candidate.created": "capturou",
};
