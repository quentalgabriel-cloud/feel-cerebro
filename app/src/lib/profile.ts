import { createClient } from "@/lib/supabase/server";
import type { Profile, Project } from "@/lib/types";
import { ensureOrganization, type OrgStore } from "@/lib/org-bootstrap";

// Resolve o usuário do Supabase Auth para a linha em `profiles`, criando-a no
// primeiro login junto com uma organização pessoal — senão a pessoa entra e
// encontra uma tela vazia sem saída ("workspace pessoal automático", kit 01).
//
// Tudo aqui roda sob RLS, com as policies da migration 0005: qualquer pessoa
// autenticada cria organização, e entra como primeiro membro de uma que ainda
// não tem ninguém. Nenhuma credencial de service role no caminho do primeiro
// acesso.
//
// Bug corrigido em 2026-09-03: a checagem de organização só rodava no MESMO
// request em que o profile era criado. A conta de teste do Gabriel tinha
// `profiles` de antes da 0005 existir — a organização nunca chegou a ser
// criada naquele login, e todo login seguinte batia em `if (existing) return`
// e nunca mais tentava de novo. Resultado visível: `/projects` carregava,
// mas criar projeto falhava em silêncio (`createProject` não achava
// `organization_members` e só dava `return`) — sem erro, sem projeto, sem
// como abrir. Agora a checagem de organização roda sempre, tenha o profile
// acabado de nascer ou não, e os dois inserts logam se falharem em vez de
// desaparecer.
export async function ensureProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  let profile = existing as Profile | null;

  if (!profile) {
    const email = user.email ?? "";
    const name =
      (user.user_metadata?.name as string) || email.split("@")[0] || "Sem nome";

    const { data: inserted, error } = await supabase
      .from("profiles")
      .insert({ auth_user_id: user.id, name, email })
      .select()
      .single();

    if (error || !inserted) {
      console.error("ensureProfile: falha ao criar profile", error);
      return null;
    }
    profile = inserted as Profile;
  }

  const bootstrap = await ensureOrganization(orgStore(supabase), profile);
  if (bootstrap.estado === "falhou") {
    console.error("ensureProfile: bootstrap de organização falhou", bootstrap.onde);
  }

  return profile;
}

// Adaptador do Supabase para a porta `OrgStore`. A decisão de quando criar
// mora em lib/org-bootstrap.ts, que é testável sem banco; aqui só se traduz
// para as chamadas do supabase-js.
function orgStore(
  supabase: Awaited<ReturnType<typeof createClient>>,
): OrgStore {
  return {
    async temMembership() {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id")
        .limit(1)
        .maybeSingle();
      return { existe: Boolean(data), erro: error ?? undefined };
    },

    async criarOrganizacao(input) {
      const { data, error } = await supabase
        .from("organizations")
        .insert(input)
        .select("id")
        .single();
      if (error || !data) {
        console.error("orgStore: falha ao criar organização", error);
        return null;
      }
      return { id: data.id as string };
    },

    async entrarComoOwner(organizationId, profileId) {
      const { error } = await supabase.from("organization_members").insert({
        organization_id: organizationId,
        profile_id: profileId,
        role: "owner",
      });
      if (error) {
        console.error("orgStore: falha ao entrar na organização", error);
      }
      return { erro: error ?? undefined };
    },
  };
}

// Projeto pelo slug, já filtrado por RLS: se a pessoa não for membro, o banco
// devolve nada e a rota dá 404. A autorização não depende desta função
// lembrar de checar.
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Project) ?? null;
}
