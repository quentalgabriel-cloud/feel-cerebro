"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { KNOWLEDGE_LABEL, type KnowledgeType } from "@/lib/types";
import type { ActionResult } from "@/lib/action-result";

const TIPOS: KnowledgeType[] = [
  "decision",
  "reasoning",
  "insight",
  "open-loop",
  "project-state",
  "source",
];

// O formulário de promoção é a fronteira entre captura e conhecimento — o
// lugar onde o sistema cobra o preço que a DEC-006 estabelece: capturar é de
// graça, promover custa uma decisão.
//
// Por isso ele NÃO vem pré-preenchido com uma classificação sugerida por
// modelo. O texto bruto aparece do lado para ser consultado, e o corpo começa
// vazio: o que vira canônico é o que a pessoa escreveu sabendo que está
// escrevendo, não o que ela aceitou por inércia.
export function PromoteForm({
  rascunho,
  acao,
}: {
  rascunho: string | null;
  acao: (estado: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="mt-2 rounded-md border border-neutral-300 px-2.5 py-1 text-[11px] font-medium transition hover:border-neutral-900"
      >
        Promover a conhecimento
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-neutral-300 bg-neutral-50 p-3">
      <ActionForm action={acao} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-neutral-600">
            Que tipo de conhecimento é isto?
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS.map((t, i) => (
              <label key={t} className="cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value={t}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span className="block rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-[11px] transition peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white">
                  {KNOWLEDGE_LABEL[t]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-neutral-600">
            Título — a afirmação, não o assunto
          </span>
          <input
            name="titulo"
            required
            placeholder="Começar as vendas manuais do W1 antes do YOUPIX"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-neutral-600">
            O quê, por quê, e o que muda se estiver errado
          </span>
          <textarea
            name="corpo"
            required
            rows={6}
            placeholder={"**O quê:** \n\n**Por quê:** \n\n**Ainda vale?** "}
            className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-neutral-900"
          />
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-neutral-600">
              Estatuto
            </span>
            <select
              name="epistemic"
              defaultValue="decisao"
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-neutral-900"
            >
              <option value="fato">fato</option>
              <option value="decisao">decisão</option>
              <option value="hipotese">hipótese</option>
              <option value="evidencia">evidência</option>
              <option value="opiniao">opinião</option>
              <option value="inferencia">inferência</option>
            </select>
          </label>

          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-neutral-600">
              Confiança
            </span>
            <select
              name="confidence"
              defaultValue="media"
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-neutral-900"
            >
              <option value="alta">alta</option>
              <option value="media">média</option>
              <option value="baixa">baixa</option>
            </select>
          </label>
        </div>

        {rascunho && (
          <details className="text-[11px] text-neutral-500">
            <summary className="cursor-pointer">Ver o texto capturado</summary>
            <p className="mt-1.5 whitespace-pre-wrap rounded border border-neutral-200 bg-white p-2 font-mono text-[10px] leading-relaxed">
              {rascunho}
            </p>
          </details>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700"
          >
            Promover
          </button>
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="text-[11px] text-neutral-500 hover:text-neutral-900"
          >
            cancelar
          </button>
          <span className="ml-auto text-[10px] leading-tight text-neutral-400">
            vira Markdown no Git
          </span>
        </div>
      </ActionForm>
    </div>
  );
}
