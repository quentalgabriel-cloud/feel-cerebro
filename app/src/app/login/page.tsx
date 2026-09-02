"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Login por email e senha — trocado do magic link em 2026-09-02, a pedido
// do Gabriel, porque o redirecionamento do magic link ficava preso em
// `localhost` mesmo depois de ajustar a URL Configuration do Supabase
// (histórico completo em SETUP-INFRAESTRUTURA.md, seção "Bug pós-deploy:
// Magic Link redireciona para localhost"). Senha não depende de link de
// e-mail nem de allow-list de redirect: `signInWithPassword` devolve a
// sessão direto na resposta da chamada.
//
// Não há autocadastro aqui de propósito. As contas dos três fundadores são
// provisionadas manualmente (ver handoff/01-ESTADO-REAL.md) — um
// formulário de "criar conta" aberto ao público aceitaria qualquer e-mail
// sem confirmar que quem está digitando é dono dele, o que a versão por
// magic link pelo menos garantia. Se isso mudar (ex.: convite por link),
// é uma decisão nova, não uma consequência automática desta troca.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) {
      setCarregando(false);
      setErro(
        error.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : error.message,
      );
      return;
    }
    // refresh() força os Server Components a rebuscar com o cookie de
    // sessão novo antes do push navegar — sem isso, /projects pode
    // renderizar uma vez ainda como deslogado.
    router.refresh();
    router.push("/projects");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xl font-semibold">Cérebro da Feel</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Entre com seu email e senha.
        </p>
      </div>

      <form onSubmit={entrar} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="voce@feel.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={carregando}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </form>

      <p className="text-xs text-neutral-400">
        Não tem conta ainda? Peça para o Gabriel provisionar a sua.
      </p>
    </main>
  );
}
