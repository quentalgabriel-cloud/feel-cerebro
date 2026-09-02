import { createClient } from "@/lib/supabase/server";
import type { Profile, Project } from "@/lib/types";

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "projeto"
  );
}

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

  await ensureOrganization(supabase, profile);

  return profile;
}

// Garante que o profile tem pelo menos uma organização — rodando em TODO
// login, não só no primeiro. Idempotente: se já existe membership (mesmo
// que a RLS só deixe ver a própria), não faz nada.
async function ensureOrganization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Profile,
): Promise<void> {
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .limit(1)
    .maybeSingle();

  if (membership) return;

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: `Espaço de ${profile.name}`,
      slug: `${slugify(profile.name)}-${Math.random().toString(36).slice(2, 7)}`,
    })
    .select()
    .single();

  if (orgError || !org) {
    console.error("ensureOrganization: falha ao criar organização", orgError);
    return;
  }

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      profile_id: profile.id,
      role: "owner",
    });

  if (memberError) {
    console.error("ensureOrganization: falha ao entrar na organização", memberError);
  }
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
