import { describe, expect, it } from "vitest";
import {
  ensureOrganization,
  nomeDaOrganizacao,
  slugDaOrganizacao,
  type OrgStore,
} from "@/lib/org-bootstrap";

// REGRESSÃO DO BUG DE 2026-09-02.
//
// Sintoma que o Gabriel viu: logava, a tela de projetos abria, ele preenchia
// o formulário, clicava em criar — e nada. Sem erro, sem projeto, sem como
// abrir. Causa: o profile dele existia desde antes da migration 0005 e nunca
// tinha ganhado organização; o bootstrap só rodava no mesmo request em que o
// profile nascia, então nunca mais tentava.
//
// O teste que teria pegado isso é o primeiro daqui: profile que JÁ existe,
// sem organização, precisa ganhar uma.

const PERFIL = { id: "p1", name: "Gabriel" };

function store(inicial: {
  temMembership?: boolean;
  erroLeitura?: unknown;
  falhaOrg?: boolean;
  erroMembership?: unknown;
}): OrgStore & { criadas: number; owners: [string, string][] } {
  let membership = inicial.temMembership ?? false;
  const registro = {
    criadas: 0,
    owners: [] as [string, string][],

    async temMembership() {
      return { existe: membership, erro: inicial.erroLeitura };
    },

    async criarOrganizacao() {
      if (inicial.falhaOrg) return null;
      registro.criadas += 1;
      return { id: `org${registro.criadas}` };
    },

    async entrarComoOwner(organizationId: string, profileId: string) {
      if (inicial.erroMembership) return { erro: inicial.erroMembership };
      registro.owners.push([organizationId, profileId]);
      membership = true;
      return {};
    },
  };
  return registro;
}

const SUFIXO = () => "abcde";

describe("bootstrap de organização", () => {
  it("cria organização para um profile que já existia sem nenhuma (o bug)", async () => {
    const s = store({ temMembership: false });

    const r = await ensureOrganization(s, PERFIL, SUFIXO);

    expect(r).toEqual({ estado: "criou", organizationId: "org1" });
    expect(s.criadas).toBe(1);
    expect(s.owners).toEqual([["org1", "p1"]]);
  });

  it("não faz nada quando já existe organização — roda em todo carregamento", async () => {
    const s = store({ temMembership: true });

    const r = await ensureOrganization(s, PERFIL, SUFIXO);

    expect(r).toEqual({ estado: "ja-tinha" });
    expect(s.criadas).toBe(0);
  });

  it("é idempotente: chamar várias vezes não cria várias organizações", async () => {
    const s = store({ temMembership: false });

    await ensureOrganization(s, PERFIL, SUFIXO);
    await ensureOrganization(s, PERFIL, SUFIXO);
    await ensureOrganization(s, PERFIL, SUFIXO);

    expect(s.criadas).toBe(1);
  });

  it("falha de leitura não é tratada como ausência", async () => {
    // Sem isto, um erro transitório do banco criaria uma organização nova a
    // cada página carregada — e a pessoa acabaria com dezenas.
    const s = store({ temMembership: false, erroLeitura: new Error("timeout") });

    const r = await ensureOrganization(s, PERFIL, SUFIXO);

    expect(r).toEqual({ estado: "falhou", onde: "leitura" });
    expect(s.criadas).toBe(0);
  });

  it("informa quando a organização não foi criada", async () => {
    const s = store({ temMembership: false, falhaOrg: true });
    expect(await ensureOrganization(s, PERFIL, SUFIXO)).toEqual({
      estado: "falhou",
      onde: "organizacao",
    });
  });

  it("informa quando a organização nasceu mas ninguém entrou nela", async () => {
    // Pior estado possível: existe, ocupa o slug, e a RLS a esconde da
    // própria pessoa. Quem chama precisa poder logar isso.
    const s = store({ temMembership: false, erroMembership: new Error("rls") });

    const r = await ensureOrganization(s, PERFIL, SUFIXO);

    expect(r).toEqual({ estado: "falhou", onde: "membership" });
    expect(s.owners).toEqual([]);
  });
});

describe("identidade da organização pessoal", () => {
  it("usa o nome da pessoa", () => {
    expect(nomeDaOrganizacao("Gabriel")).toBe("Espaço de Gabriel");
  });

  it("gera slug limpo, com sufixo para não colidir entre xarás", () => {
    expect(slugDaOrganizacao("Gabriel", SUFIXO)).toBe("gabriel-abcde");
    expect(slugDaOrganizacao("Gabrielle Quental", SUFIXO)).toBe(
      "gabrielle-quental-abcde",
    );
  });
});
