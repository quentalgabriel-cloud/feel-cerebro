import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pessoaAtualOuErro } from "@/lib/pessoa-atual";

const BUCKET = "arquivos-raw";

// Gera uma signed upload URL para o navegador subir o arquivo direto pro
// Supabase Storage — sem passar pela Function (MODELO-DE-DADOS.md §3.1:
// evita timeout e limite de payload da Function com um PDF grande).
export async function POST(request: Request) {
  const { pessoa, erro } = await pessoaAtualOuErro();
  if (!pessoa) {
    return NextResponse.json({ erro }, { status: 401 });
  }

  const { nomeOriginal } = (await request.json()) as { nomeOriginal: string };
  if (!nomeOriginal) {
    return NextResponse.json({ erro: "nomeOriginal ausente." }, { status: 400 });
  }

  const path = `${pessoa.id}/${Date.now()}-${nomeOriginal}`;
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    bucket: BUCKET,
  });
}
