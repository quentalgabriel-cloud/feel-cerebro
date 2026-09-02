import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ItemInbox, StatusInbox } from "@/lib/types";

const STATUS_LABEL: Record<StatusInbox, string> = {
  novo: "Novo",
  em_extracao: "Extraindo texto…",
  pronto_para_revisao: "Pronto para revisão",
  promovido: "Promovido",
  descartado: "Descartado",
};

const STATUS_CLASS: Record<StatusInbox, string> = {
  novo: "bg-blue-100 text-blue-800",
  em_extracao: "bg-amber-100 text-amber-800",
  pronto_para_revisao: "bg-emerald-100 text-emerald-800",
  promovido: "bg-neutral-100 text-neutral-500",
  descartado: "bg-neutral-100 text-neutral-400 line-through",
};

// Lista compartilhada — por desenho, os três veem tudo desde a captura
// (MODELO-DE-DADOS.md §5.5, "visibilidade total" assumida até decidirem o
// contrário).
export default async function InboxPage() {
  const supabase = await createClient();
  const { data: itens, error } = await supabase
    .from("itens_inbox")
    .select("*, pessoas!itens_inbox_autor_id_fkey(nome)")
    .order("criado_em", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Inbox</h1>
          <p className="text-sm text-neutral-500">
            Tudo que os três capturaram, ainda não promovido a conhecimento.
          </p>
        </div>
        <Link
          href="/inbox/novo"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Capturar
        </Link>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Não consegui carregar o inbox: {error.message}
        </p>
      )}

      {!error && (!itens || itens.length === 0) && (
        <p className="rounded-md border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          Nada capturado ainda. Cole um texto ou envie um arquivo.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {itens?.map(
          (
            item: ItemInbox & { pessoas: { nome: string } | null },
          ) => (
            <li key={item.id}>
              <Link
                href={`/inbox/${item.id}`}
                className="flex items-center justify-between rounded-md border border-neutral-200 px-4 py-3 hover:border-neutral-400"
              >
                <div>
                  <p className="text-sm font-medium">
                    {item.titulo_sugerido || "(sem título sugerido)"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {item.pessoas?.nome ?? "—"} ·{" "}
                    {new Date(item.criado_em).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[item.status]}`}
                >
                  {STATUS_LABEL[item.status]}
                </span>
              </Link>
            </li>
          ),
        )}
      </ul>
    </main>
  );
}
