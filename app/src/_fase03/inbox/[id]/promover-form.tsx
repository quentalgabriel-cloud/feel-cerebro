"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Confianca, Epistemico, Escopo, Eixo, TipoNota } from "@/lib/types";

const TIPOS: { value: TipoNota; label: string }[] = [
  { value: "decision", label: "Decisão" },
  { value: "reasoning", label: "Raciocínio" },
  { value: "insight", label: "Insight" },
  { value: "open-loop", label: "Ponta solta" },
  { value: "source", label: "Fonte" },
];

// Só o que é preenchível na promoção (MODELO-DE-DADOS.md §3.4). Nenhum
// destes é obrigatório na captura (princípio 3) — mas promover exige pelo
// menos tipo, título e escopo, porque são os três campos que decidem onde
// e como o arquivo Markdown é gravado no Git.
export function PromoverForm({
  itemId,
  eixos,
  textoDisponivel,
}: {
  itemId: string;
  eixos: Eixo[];
  textoDisponivel: boolean;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoNota>("insight");
  const [titulo, setTitulo] = useState("");
  const [escopo, setEscopo] = useState<Escopo>("feel");
  const [eixoId, setEixoId] = useState("");
  const [epistemico, setEpistemico] = useState<Epistemico | "">("");
  const [confianca, setConfianca] = useState<Confianca | "">("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function promover(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemInboxId: itemId,
          tipo,
          titulo,
          escopo,
          eixoId: eixoId || null,
          epistemico: epistemico || null,
          confianca: confianca || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro ?? "Falha ao promover.");
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={promover} className="mt-6 flex flex-col gap-4 border-t border-neutral-200 pt-6">
      <h2 className="text-sm font-semibold text-neutral-700">Promover a conhecimento</h2>

      {!textoDisponivel && (
        <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          Sem texto ainda — promover vai falhar até haver conteúdo.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Título
        <input
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoNota)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Escopo
          <select
            value={escopo}
            onChange={(e) => setEscopo(e.target.value as Escopo)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="feel">Feel</option>
            <option value="pessoal">Pessoal</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Eixo{" "}
          <span className="text-xs font-normal text-neutral-400">
            (opcional — eixos ainda não definidos)
          </span>
          <select
            value={eixoId}
            onChange={(e) => setEixoId(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">— nenhum ainda —</option>
            {eixos.map((eixo) => (
              <option key={eixo.id} value={eixo.id}>
                {eixo.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Confiança <span className="text-xs font-normal text-neutral-400">(opcional)</span>
          <select
            value={confianca}
            onChange={(e) => setConfianca(e.target.value as Confianca)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-sm">
          Estado epistêmico <span className="text-xs font-normal text-neutral-400">(opcional)</span>
          <select
            value={epistemico}
            onChange={(e) => setEpistemico(e.target.value as Epistemico)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="fato">Fato</option>
            <option value="evidencia">Evidência</option>
            <option value="decisao">Decisão</option>
            <option value="hipotese">Hipótese</option>
            <option value="inferencia">Inferência</option>
            <option value="opiniao">Opinião</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={enviando || !titulo.trim()}
        className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {enviando ? "Promovendo…" : "Promover"}
      </button>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </form>
  );
}
