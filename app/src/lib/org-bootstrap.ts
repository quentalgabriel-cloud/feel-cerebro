// A decisão de criar a organização pessoal, isolada do Supabase.
//
// Existe porque o bug de 2026-09-02 não estava na query nem na RLS: estava na
// DECISÃO de quando rodar o bootstrap. `ensureProfile()` só tentava criar a
// organização no mesmo request em que o profile nascia, então um profile
// criado antes da migration 0005 ficava para sempre sem organização — e
// criar projeto falhava em silêncio, sem erro, sem linha, sem pista.
//
// Lógica de decisão que não dá para testar sem banco é lógica que só é
// testada em produção. Por isso o acesso a dados entra por esta porta
// estreita (`OrgStore`): o teste implementa a porta em dez linhas e prova o
// caso real — profile que já existe, organização que não.

import { slugify } from "@/lib/slug";

export interface OrgStore {
  // Sob RLS, "existe membership" já significa "existe membership MINHA":
  // a policy de select só devolve as linhas do próprio profile.
  temMembership(): Promise<{ existe: boolean; erro?: unknown }>;
  criarOrganizacao(input: {
    name: string;
    slug: string;
  }): Promise<{ id: string } | null>;
  entrarComoOwner(
    organizationId: string,
    profileId: string,
  ): Promise<{ erro?: unknown }>;
}

export type ResultadoBootstrap =
  | { estado: "ja-tinha" }
  | { estado: "criou"; organizationId: string }
  | { estado: "falhou"; onde: "leitura" | "organizacao" | "membership" };

export function nomeDaOrganizacao(nomeDaPessoa: string): string {
  return `Espaço de ${nomeDaPessoa}`;
}

// O sufixo aleatório evita colisão de slug entre duas pessoas de mesmo nome.
// Recebe o gerador por parâmetro para o teste poder ser determinístico —
// aleatoriedade escondida dentro da função é o que torna um teste instável.
export function slugDaOrganizacao(
  nomeDaPessoa: string,
  sufixo: () => string,
): string {
  return `${slugify(nomeDaPessoa)}-${sufixo()}`;
}

export function sufixoAleatorio(): string {
  return Math.random().toString(36).slice(2, 7);
}

// Idempotente por contrato: chamada em todo carregamento de página, precisa
// não fazer nada quando já existe organização. É essa idempotência que a
// transforma no mecanismo de auto-cura de qualquer conta que fique no estado
// quebrado — inclusive as que já estavam quebradas antes da correção.
export async function ensureOrganization(
  store: OrgStore,
  profile: { id: string; name: string },
  sufixo: () => string = sufixoAleatorio,
): Promise<ResultadoBootstrap> {
  const { existe, erro } = await store.temMembership();

  // Falha de leitura não é "não tem" — tratar como ausência criaria uma
  // organização duplicada toda vez que o banco piscasse.
  if (erro) return { estado: "falhou", onde: "leitura" };
  if (existe) return { estado: "ja-tinha" };

  const org = await store.criarOrganizacao({
    name: nomeDaOrganizacao(profile.name),
    slug: slugDaOrganizacao(profile.name, sufixo),
  });

  if (!org) return { estado: "falhou", onde: "organizacao" };

  const { erro: erroMembership } = await store.entrarComoOwner(
    org.id,
    profile.id,
  );

  // Organização criada e ninguém dentro é o pior estado possível: invisível
  // para a própria pessoa (a RLS esconde) e ocupando o slug. Quem chama
  // precisa saber para logar — e a próxima passada cria outra, porque
  // `temMembership` continuará falso.
  if (erroMembership) return { estado: "falhou", onde: "membership" };

  return { estado: "criou", organizationId: org.id };
}
