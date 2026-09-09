import { describe, expect, it } from "vitest";
import {
  caminhoNoRepo,
  lerFrontmatter,
  lerItemCanonico,
  nomeDeArquivo,
  renderizarMarkdown,
  tituloDoCorpo,
  type ItemCanonico,
} from "@/lib/knowledge-markdown";

// O teste que justifica o módulo existir: `ler(renderizar(x)) === x`.
//
// A promoção escreve e o reindex lê. Enquanto esta suíte passar, os dois
// lados falam a mesma língua. Se um dia alguém mexer só no escritor, é aqui
// que aparece — e não num arquivo que o índice silenciosamente parou de
// entender seis meses depois.

const ITEM: ItemCanonico = {
  id: "DEC-042",
  type: "decision",
  project: "feel",
  scope: "cliente:feel",
  status: "ativa",
  epistemic: "decisao",
  confidence: "alta",
  created: "2026-09-09",
  updated: "2026-09-09",
  source: "candidates/abc-123",
  origem: "gabriel-afirmou",
  related: ["DEC-013", "INS-001"],
  supersedes: ["DEC-007"],
  title: "Começar as vendas manuais do W1 antes do YOUPIX",
  body: "**O quê:** iniciar vendas manuais.\n\n**Por quê:** porque elaborar mais\nnão responde a pergunta que só o mercado responde.",
};

describe("ida e volta", () => {
  it("o que a promoção escreve, o reindex lê de volta igual", () => {
    const lido = lerItemCanonico(renderizarMarkdown(ITEM));

    expect(lido.id).toBe(ITEM.id);
    expect(lido.type).toBe(ITEM.type);
    expect(lido.project).toBe(ITEM.project);
    expect(lido.scope).toBe(ITEM.scope);
    expect(lido.status).toBe(ITEM.status);
    expect(lido.epistemic).toBe(ITEM.epistemic);
    expect(lido.confidence).toBe(ITEM.confidence);
    expect(lido.created).toBe(ITEM.created);
    expect(lido.updated).toBe(ITEM.updated);
    expect(lido.source).toBe(ITEM.source);
    expect(lido.origem).toBe(ITEM.origem);
    expect(lido.related).toEqual(ITEM.related);
    expect(lido.supersedes).toEqual(ITEM.supersedes);
    expect(lido.title).toBe(ITEM.title);
    expect(lido.body).toBe(ITEM.body);
  });

  it("sobrevive a duas voltas — renderizar o que foi lido dá o mesmo texto", () => {
    const uma = renderizarMarkdown(ITEM);
    const duas = renderizarMarkdown({
      ...lerItemCanonico(uma),
      origem: ITEM.origem,
    } as ItemCanonico);
    expect(duas).toBe(uma);
  });

  it("aguenta listas vazias sem virar string vazia", () => {
    const semRelacoes = { ...ITEM, related: [], supersedes: [] };
    const lido = lerItemCanonico(renderizarMarkdown(semRelacoes));
    expect(lido.related).toEqual([]);
    expect(lido.supersedes).toEqual([]);
  });

  it("aguenta corpo com acento, dois pontos e markdown", () => {
    const complicado = {
      ...ITEM,
      title: "Decisão: não construir grafo antes do ciclo",
      body: "- item com `código`\n- outro com **negrito**\n\n> citação: com dois pontos",
    };
    const lido = lerItemCanonico(renderizarMarkdown(complicado));
    expect(lido.title).toBe(complicado.title);
    expect(lido.body).toBe(complicado.body);
  });
});

describe("compatibilidade com o que o Gabriel já escreveu à mão", () => {
  // Frontmatter real, copiado de 04-memoria/decisoes/dec-006 do vault. O
  // parser precisa ler o que já existe, não só o que nós escrevemos.
  const REAL = `---
id: DEC-006
type: decision
project: cerebro
scope: pessoal
status: ativa
epistemic: decisao
confidence: alta
created: 2026-08-25
updated: 2026-08-25
source: 02-fontes/chats/2026-08-18.md L643-L695
related: []
supersedes:
---

# Captura automática, promoção seletiva

**O quê:** qualquer coisa pode ser capturada.`;

  it("lê o formato que já está no vault", () => {
    const { meta, corpo } = lerFrontmatter(REAL);
    expect(meta.id).toBe("DEC-006");
    expect(meta.type).toBe("decision");
    expect(meta.related).toEqual([]);
    expect(tituloDoCorpo(corpo)).toBe("Captura automática, promoção seletiva");
  });

  it("campo vazio sem colchete não vira lista fantasma", () => {
    const { meta } = lerFrontmatter(REAL);
    expect(meta.supersedes).toBe("");
  });
});

describe("caminho no repositório", () => {
  it("cada tipo tem a sua pasta, igual à do vault", () => {
    expect(caminhoNoRepo("decision", "DEC-042", "Vender antes")).toBe(
      "04-memoria/decisoes/dec-042-vender-antes.md",
    );
    expect(caminhoNoRepo("insight", "INS-007", "Captura vira aterro")).toBe(
      "04-memoria/insights/ins-007-captura-vira-aterro.md",
    );
    expect(caminhoNoRepo("open-loop", "OL-002", "Node instalado?")).toBe(
      "04-memoria/open-loops/ol-002-node-instalado.md",
    );
  });

  it("tira acento do nome do arquivo — usa o slugify testado", () => {
    expect(nomeDeArquivo("DEC-001", "Decisão sobre coordenação")).toBe(
      "dec-001-decisao-sobre-coordenacao.md",
    );
  });

  it("título vazio nao gera arquivo sem nome", () => {
    expect(nomeDeArquivo("DEC-001", "")).toBe("dec-001-projeto.md");
  });
});
