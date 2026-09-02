import { Octokit } from "@octokit/rest";

// Credencial de escrita no repo — pendência sinalizada em
// SETUP-INFRAESTRUTURA.md §5 (token pessoal de escopo restrito vs. GitHub
// App). Enquanto não existir, promote falha com uma mensagem clara em vez
// de um erro genérico de rede.
export function githubConfigurado() {
  return Boolean(
    process.env.GITHUB_TOKEN &&
      process.env.GITHUB_OWNER &&
      process.env.GITHUB_REPO,
  );
}

// Commita direto na branch principal (MODELO-DE-DADOS.md §5.2 assume commit
// direto, não PR — pergunta em aberto, pode mudar depois; se mudar, é aqui
// que a chamada vira "criar branch + abrir PR" em vez de updateOrCreate).
export async function commitarMarkdown(params: {
  caminho: string;
  conteudo: string;
  mensagem: string;
}): Promise<{ commitSha: string }> {
  if (!githubConfigurado()) {
    throw new Error(
      "GitHub não configurado (GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO ausentes). " +
        "Ver SETUP-INFRAESTRUTURA.md §5.",
    );
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  const { data: commit } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    branch,
    path: params.caminho,
    message: params.mensagem,
    content: Buffer.from(params.conteudo, "utf-8").toString("base64"),
  });

  return { commitSha: commit.commit.sha! };
}
