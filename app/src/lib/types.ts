// Espelha supabase/migrations/0001_foundation.sql. Mantenha os dois em
// sincronia até valer a pena gerar isto automaticamente do schema.

export type Role = "owner" | "builder" | "viewer";

export type StateKind = "now" | "next" | "not_now";

export type CandidateStatus =
  | "pending"
  | "extracting"
  | "ready_for_review"
  | "promoted"
  | "rejected";

export type OriginType =
  | "pasted"
  | "upload_pdf"
  | "upload_docx"
  | "upload_markdown"
  | "upload_txt";

// Tipos de evento existentes na Fase 01. A lista cresce por fase — cada
// evento novo é uma decisão, não um efeito colateral.
export type EventType =
  | "project.created"
  | "project_state.updated"
  | "state_item.added"
  | "state_item.removed"
  | "state_item.promoted"
  | "candidate.created";

export interface Profile {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  what_building: string | null;
  why_exists: string | null;
  created_by: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface ProjectState {
  project_id: string;
  objective: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface StateItem {
  id: string;
  project_id: string;
  kind: StateKind;
  content: string;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectEvent {
  id: string;
  project_id: string;
  type: EventType;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Candidate {
  id: string;
  project_id: string;
  author_id: string;
  origin_type: OriginType;
  raw_file_id: string | null;
  raw_text: string | null;
  suggested_title: string | null;
  status: CandidateStatus;
  promoted_knowledge_id: string | null;
  created_at: string;
  promoted_at: string | null;
}

// As seis classes da DEC-002 do vault `cerebro`, que a DEC-013 fixou como o
// vocabulário do sistema inteiro — vencendo os cinco tipos da D-02 do plano da
// Feel, que nunca chegaram a ser implementados. Os tipos da D-02 que não estão
// aqui entram pelo eixo `epistemic`, não como classe nova.
export type KnowledgeType =
  | "decision"
  | "reasoning"
  | "insight"
  | "open-loop"
  | "project-state"
  | "source";

export const KNOWLEDGE_LABEL: Record<KnowledgeType, string> = {
  decision: "decisão",
  reasoning: "raciocínio",
  insight: "insight",
  "open-loop": "loop aberto",
  "project-state": "estado",
  source: "fonte",
};

// De onde veio a afirmação. É o campo que a DEC-012 preservou ao suspender a
// trava de aprovação manual: sem ele, em três meses não há como distinguir o
// que o Gabriel decidiu do que um modelo inferiu.
export type Origem = "gabriel-afirmou" | "ai-inferido";

// Projeção do Markdown que vive no Git. DERIVADA: nada aqui é verdade que não
// exista no arquivo — se divergir, quem está certo é o Git.
export interface KnowledgeItem {
  id: string;
  project_id: string;
  display_id: string;
  type: KnowledgeType;
  scope: string;
  status: string;
  epistemic: string | null;
  confidence: string | null;
  title: string;
  created_at_md: string | null;
  updated_at_md: string | null;
  source_ref: string | null;
  repo: string;
  path: string;
  commit_sha: string | null;
  body: string | null;
  origem: Origem;
  indexed_at: string;
}

// Limites do kit, impostos também pelo banco (0001_foundation.sql):
// NOW = 1 por índice único parcial, NEXT <= 3 por check constraint.
export const MAX_NEXT = 3;
