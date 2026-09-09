"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/action-result";

// Upload: a última travessia da ponte — arquivo do PC vira fonte no sistema.
//
// O arquivo sobe do NAVEGADOR direto para o Storage, sem passar pela Server
// Action. Não é otimização prematura: uma Function tem limite de payload e de
// tempo, e um PDF de 4 MB (que este acervo tem aos montes) estoura os dois. A
// Action registra o que subiu; ela nunca carrega o arquivo.
//
// Extração de texto acontece aqui só para formato que é texto de verdade —
// `.md`, `.txt`, `.csv`, `.json`. Para PDF e DOCX o arquivo é guardado
// íntegro e o candidate nasce marcado como "à espera de extração", em vez de
// o sistema fingir que leu. Fingir seria pior que não ler: viraria um
// candidate vazio que ninguém sabe que está vazio.

const TEXTO = [".md", ".txt", ".csv", ".json", ".markdown"];
const LIMITE_MB = 25;

export function UploadForm({
  projectId,
  profileId,
  acao,
}: {
  projectId: string;
  profileId: string;
  acao: (dados: {
    storagePath: string;
    nome: string;
    mime: string;
    tamanho: number;
    texto: string | null;
  }) => Promise<ActionResult>;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function enviar(arquivo: File) {
    setErro(null);
    setAviso(null);

    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      setErro(`Arquivo acima de ${LIMITE_MB} MB. Suba um trecho, ou o texto colado.`);
      return;
    }

    setEnviando(true);
    const supabase = createClient();

    // O prefixo do caminho é o project_id — é ele que a policy do bucket usa
    // para decidir acesso (migration 0010). Mudar este formato quebra a
    // autorização do Storage, não só a organização das pastas.
    const caminho = `${projectId}/${profileId}/${Date.now()}-${arquivo.name}`;

    const { error: erroUpload } = await supabase.storage
      .from("raw-files")
      .upload(caminho, arquivo, { upsert: false });

    if (erroUpload) {
      setEnviando(false);
      setErro(`Não consegui subir o arquivo: ${erroUpload.message}`);
      return;
    }

    const ehTexto = TEXTO.some((e) => arquivo.name.toLowerCase().endsWith(e));
    const texto = ehTexto ? await arquivo.text() : null;

    const resultado = await acao({
      storagePath: caminho,
      nome: arquivo.name,
      mime: arquivo.type || "application/octet-stream",
      tamanho: arquivo.size,
      texto,
    });

    setEnviando(false);

    if (!resultado.ok) {
      // O arquivo está no Storage; o registro é que falhou. Dizer isso é
      // melhor que sugerir que nada aconteceu — o bruto não se perdeu.
      setErro(`${resultado.message} O arquivo subiu, mas não foi registrado.`);
      return;
    }

    if (!ehTexto) {
      setAviso(
        "Arquivo guardado íntegro. O texto ainda não foi extraído — a captura fica marcada como pendente até a extração rodar.",
      );
    }

    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-4">
      <label className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-neutral-600">
          Subir arquivo — vira fonte, com o bruto preservado
        </span>
        <input
          ref={input}
          type="file"
          disabled={enviando}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void enviar(f);
          }}
          className="text-xs file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:border-neutral-900 disabled:opacity-50"
        />
      </label>

      <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
        Markdown, txt, csv e json têm o texto lido na hora. PDF e DOCX são
        guardados íntegros e ficam à espera de extração — o arquivo original
        nunca é descartado, em nenhum dos casos.
      </p>

      {enviando && (
        <p className="mt-2 text-[11px] text-neutral-500">Enviando…</p>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-[11px] leading-relaxed text-red-600">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-900">
          {aviso}
        </p>
      )}
    </div>
  );
}
