"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { captureText } from "@/app/p/[slug]/capture-actions";

// Captura global, com atalho. A fricção aqui é o inimigo: se capturar custar
// mais do que não capturar, ninguém captura, e o sistema inteiro fica sem
// matéria-prima. Nenhum campo de classificação — classificar é trabalho de
// promoção (Fase 03), não de entrada.
export function QuickCapture({ projectId }: { projectId: string }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto(true);
      }
      if (e.key === "Escape") setAberto(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (aberto) ref.current?.focus();
  }, [aberto]);

  async function salvar() {
    if (!texto.trim() || salvando) return;
    setSalvando(true);
    await captureText(projectId, texto);
    setTexto("");
    setSalvando(false);
    setAberto(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-md bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700"
      >
        Capturar
        <kbd className="ml-1.5 hidden font-sans text-[10px] text-neutral-400 sm:inline">
          ⌘K
        </kbd>
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-neutral-900/20 p-4 pt-[15vh]"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              ref={ref}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") salvar();
              }}
              rows={5}
              placeholder="Cole ou escreva. Sem classificar nada agora."
              className="w-full resize-none rounded-md border border-neutral-200 p-3 text-sm outline-none focus:border-neutral-400"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                ⌘↵ para salvar · esc para fechar
              </span>
              <button
                onClick={salvar}
                disabled={!texto.trim() || salvando}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40"
              >
                {salvando ? "Salvando…" : "Capturar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
