"use client";

import { useActionState } from "react";
import { ACTION_IDLE, type ActionResult } from "@/lib/action-result";

// Formulário que mostra a falha da Server Action em vez de engolir.
//
// Todo formulário do app passa por aqui. A alternativa — `<form action={fn}>`
// direto — não tem onde pendurar a resposta da ação, e foi assim que uma
// falha real (conta sem organização) virou "cliquei em criar e não aconteceu
// nada" por horas, sem uma linha de erro em lugar nenhum.
//
// A ação recebe `(estadoAnterior, formData)` — assinatura que o
// `useActionState` exige (ver node_modules/next/dist/docs/01-app/02-guides/
// forms.md, seção "Validation errors"). O React reseta os campos não
// controlados sozinho quando a ação termina bem.
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (estado: ActionResult, formData: FormData) => Promise<ActionResult>;
  className?: string;
  children: React.ReactNode;
}) {
  const [estado, formAction, pendente] = useActionState(action, ACTION_IDLE);

  return (
    <div className="flex flex-col gap-1.5">
      {/* O layout vive no fieldset, que é quem contém os campos de fato; o
          `disabled` durante o envio também evita submit duplo. O reset do
          Tailwind já zera borda, margem e padding de fieldset. */}
      <form action={formAction} aria-busy={pendente || undefined}>
        <fieldset disabled={pendente} className={className}>
          {children}
        </fieldset>
      </form>
      {!estado.ok && (
        <p role="alert" className="text-xs leading-relaxed text-red-600">
          {estado.message}
        </p>
      )}
    </div>
  );
}
