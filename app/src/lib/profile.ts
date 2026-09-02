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

  if (existing) return existing as Profile;

  const email = user.email ?? "";
  const name =
    (user.user_metadata?.name as string) || email.split("@")[0] || "Sem nome";

  const { data: profile } = await supabase
    .from("profiles")
    .insert({ auth_user_id: user.id, name, email })
    .select()
    .single();

  if (!profile) return null;

  const { data: org } = await supabase
    .from("organizations")
    .insert({
      name: `Espaço de ${name}`,
      slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`,
    })
    .select()
    .single();

  if (org) {
    await supabase.from("organization_members").insert({
      organization_id: org.id,
      profile_id: profile.id,
      role: "owner",
    });
  }

  return profile as Profile;
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
