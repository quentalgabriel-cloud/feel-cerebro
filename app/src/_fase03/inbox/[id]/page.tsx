import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PromoverForm } from "./promover-form";

export default async function ItemInboxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("itens_inbox")
    .select("*, pessoas!itens_inbox_autor_id_fkey(nome)")
    .eq("id", id)
    .single();

  if (!item) notFound();

  const { data: eixos } = await supabase
    .from("eixos")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true, nullsFirst: false });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs text-neutral-500">
        Capturado por {item.pessoas?.nome ?? "—"} em{" "}
        {new Date(item.criado_em).toLocaleString("pt-BR")}
      </p>
      <h1 className="mt-1 text-xl font-semibold">
        {item.titulo_sugerido || "(sem título sugerido)"}
      </h1>

      <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-4">
        {item.texto_bruto ? (
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {item.texto_bruto}
          </pre>
        ) : (
          <p className="text-sm text-neutral-500">
            {item.status === "em_extracao"
              ? "Extraindo texto do arquivo…"
              : "Sem texto extraído ainda — extração automática de arquivos não está ligada (SETUP-INFRAESTRUTURA.md). Se este item veio de upload, abra o arquivo original e cole o texto manualmente por enquanto."}
          </p>
        )}
      </div>

      {item.status === "promovido" ? (
        <p className="mt-6 rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
          Já promovido como <strong>{item.nota_promovida_id}</strong>.
        </p>
      ) : (
        <PromoverForm itemId={item.id} eixos={eixos ?? []} textoDisponivel={Boolean(item.texto_bruto)} />
      )}
    </main>
  );
}
