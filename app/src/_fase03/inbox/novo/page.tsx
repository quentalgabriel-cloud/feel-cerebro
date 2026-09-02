"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Modo = "colar" | "upload";

const EXTENSOES_ACEITAS: Record<string, string> = {
  "application/pdf": "upload_pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "upload_docx",
  "text/markdown": "upload_markdown",
  "text/plain": "upload_txt",
};

export default function NovaCapturaPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("colar");
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function capturarTexto() {
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo_origem: "colado", texto_bruto: texto }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro ?? "Falha ao capturar.");
      router.push(`/inbox/${json.item.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setEnviando(false);
    }
  }

  async function capturarArquivo() {
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    try {
      const tipoOrigem = EXTENSOES_ACEITAS[arquivo.type];
      if (!tipoOrigem) {
        throw new Error(
          "Tipo de arquivo não suportado ainda. Aceitos: PDF, DOCX, Markdown, TXT.",
        );
      }

      // 1. pede uma signed upload URL
      const resUrl = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nomeOriginal: arquivo.name }),
      });
      const dadosUrl = await resUrl.json();
      if (!resUrl.ok) throw new Error(dadosUrl.erro ?? "Falha ao preparar upload.");

      // 2. sobe direto pro Storage, sem passar pela nossa API
      const supabase = createClient();
      const { error: erroUpload } = await supabase.storage
        .from(dadosUrl.bucket)
        .uploadToSignedUrl(dadosUrl.path, dadosUrl.token, arquivo);
      if (erroUpload) throw erroUpload;

      // 3. registra arquivo_raw + item de inbox
      const resItem = await fetch("/api/inbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tipo_origem: tipoOrigem,
          arquivo: {
            storage_path: dadosUrl.path,
            nome_original: arquivo.name,
            mime_type: arquivo.type,
            tamanho_bytes: arquivo.size,
          },
        }),
      });
      const item = await resItem.json();
      if (!resItem.ok) throw new Error(item.erro ?? "Falha ao registrar item.");
      router.push(`/inbox/${item.item.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-semibold">Capturar</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cole um texto ou envie um arquivo. Sem campo obrigatório além disso —
        classificar é trabalho da promoção, não da captura.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setModo("colar")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            modo === "colar"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-600"
          }`}
        >
          Colar texto
        </button>
        <button
          onClick={() => setModo("upload")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            modo === "upload"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-600"
          }`}
        >
          Enviar arquivo
        </button>
      </div>

      <div className="mt-6">
        {modo === "colar" ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={12}
              placeholder="Cole aqui — raciocínio, trecho de chat, ideia solta…"
              className="rounded-md border border-neutral-300 p-3 text-sm outline-none focus:border-neutral-500"
            />
            <button
              onClick={capturarTexto}
              disabled={enviando || !texto.trim()}
              className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {enviando ? "Capturando…" : "Capturar"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept=".pdf,.docx,.md,.txt"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <p className="text-xs text-neutral-500">
              Extração automática de texto ainda não está ligada (ver
              SETUP-INFRAESTRUTURA.md) — o arquivo é guardado com segurança e
              fica marcado para revisão manual até o extrator existir.
            </p>
            <button
              onClick={capturarArquivo}
              disabled={enviando || !arquivo}
              className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {enviando ? "Enviando…" : "Enviar"}
            </button>
          </div>
        )}
        {erro && <p className="mt-3 text-sm text-red-600">{erro}</p>}
      </div>
    </main>
  );
}
