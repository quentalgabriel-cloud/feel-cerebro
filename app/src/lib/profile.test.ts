import { beforeEach, describe, expect, it, vi } from "vitest";

// Este arquivo testa a FUNÇÃO ONDE O BUG DE 2026-09-02 MORAVA.
//
// `org-bootstrap.test.ts` prova que a decisão de criar organização é correta
// e idempotente. Isso não teria pegado o bug: a decisão estava certa, ela é
// que nunca era chamada. O bug era `ensureProfile()` sair no primeiro
// `return` quando o profile já existia — então o teste que importa é este,
// com um profile que JÁ EXISTE e nenhuma organização.

const supabaseFake = vi.hoisted(() => ({ criar: (() => {}) as unknown }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => (supabaseFake.criar as () => unknown)(),
}));

const { ensureProfile } = await import("@/lib/profile");

type Resultado = { data?: unknown; error?: unknown };

// Fake mínimo do supabase-js: só as formas de chamada que profile.ts usa.
// O builder é "thenable" porque `await supabase.from(x).insert(y)` — sem
// `.select()` no fim — é exatamente como o supabase-js se comporta.
function fakeSupabase(opcoes: {
  user: { id: string; email: string } | null;
  profileExistente: { id: string; name: string } | null;
  temMembership: boolean;
}) {
  const registro = {
    inserts: [] as { tabela: string; payload: Record<string, unknown> }[],
  };

  function resposta(tabela: string, op: "select" | "insert"): Resultado {
    if (tabela === "profiles") {
      return op === "select"
        ? { data: opcoes.profileExistente }
        : { data: { id: "novo-profile", name: "Novo" } };
    }
    if (tabela === "organization_members") {
      return op === "select"
        ? { data: opcoes.temMembership ? { organization_id: "org-existente" } : null }
        : {};
    }
    if (tabela === "organizations") {
      return { data: { id: "org-nova" } };
    }
    return {};
  }

  function from(tabela: string) {
    let op: "select" | "insert" = "select";
    const builder = {
      select: () => builder,
      eq: () => builder,
      limit: () => builder,
      insert: (payload: Record<string, unknown>) => {
        op = "insert";
        registro.inserts.push({ tabela, payload });
        return builder;
      },
      maybeSingle: async () => resposta(tabela, op),
      single: async () => resposta(tabela, op),
      then: (
        resolve: (r: Resultado) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve(resposta(tabela, op)).then(resolve, reject),
    };
    return builder;
  }

  return {
    registro,
    cliente: {
      auth: { getUser: async () => ({ data: { user: opcoes.user } }) },
      from,
    },
  };
}

function montar(opcoes: Parameters<typeof fakeSupabase>[0]) {
  const { cliente, registro } = fakeSupabase(opcoes);
  supabaseFake.criar = () => cliente;
  return registro;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ensureProfile", () => {
  it("cria organização para profile que já existe e não tem nenhuma (o bug)", async () => {
    const registro = montar({
      user: { id: "auth-1", email: "gabriel@feel.com" },
      profileExistente: { id: "p1", name: "Gabriel" },
      temMembership: false,
    });

    const profile = await ensureProfile();

    expect(profile).toEqual({ id: "p1", name: "Gabriel" });

    const tabelasInseridas = registro.inserts.map((i) => i.tabela);
    // O profile já existia: não se insere de novo. A organização, sim.
    expect(tabelasInseridas).toEqual(["organizations", "organization_members"]);
    expect(registro.inserts[1].payload).toMatchObject({
      profile_id: "p1",
      role: "owner",
    });
  });

  it("não cria nada quando o profile já tem organização", async () => {
    const registro = montar({
      user: { id: "auth-1", email: "gabriel@feel.com" },
      profileExistente: { id: "p1", name: "Gabriel" },
      temMembership: true,
    });

    await ensureProfile();

    expect(registro.inserts).toEqual([]);
  });

  it("no primeiro login cria profile e organização", async () => {
    const registro = montar({
      user: { id: "auth-2", email: "axel@feel.com" },
      profileExistente: null,
      temMembership: false,
    });

    await ensureProfile();

    expect(registro.inserts.map((i) => i.tabela)).toEqual([
      "profiles",
      "organizations",
      "organization_members",
    ]);
    // Sem nome no metadata, o nome sai do e-mail — não fica "Sem nome".
    expect(registro.inserts[0].payload).toMatchObject({
      auth_user_id: "auth-2",
      email: "axel@feel.com",
      name: "axel",
    });
  });

  it("sem sessão devolve null e não escreve nada", async () => {
    const registro = montar({
      user: null,
      profileExistente: null,
      temMembership: false,
    });

    expect(await ensureProfile()).toBeNull();
    expect(registro.inserts).toEqual([]);
  });
});
