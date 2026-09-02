# ADR-0004 — Conhecimento durável versionado no Git

**Estado:** Aceito, **ainda não implementado** — é a Fase 03 · 2026-08
(registrado formalmente em 2026-09-03)

## Contexto

O sistema captura muito e barato (Quick Capture grava `candidate` sem pedir
classificação). A pergunta é onde mora o que **sobrevive**: uma decisão
tomada, uma hipótese com evidência, uma spec.

Conhecimento tem propriedades que estado não tem — precisa de histórico
legível, de autoria, de revisão, e precisa poder ser lido daqui a três anos
por alguém que não tem acesso a este banco.

## Decisão

Conhecimento canônico é **Markdown versionado no Git**, com frontmatter
carregando tipo, proveniência e autoria. O Postgres guarda um `knowledge_index`
**derivado e 100% reconstruível** a partir do Git.

Promoção de `candidate` para canônico é **ato humano deliberado**. Síntese
por IA (Fase 06 em diante) pode criar Candidate; **nunca promove.**

## Alternativas descartadas

**Conhecimento em tabela.** Consulta mais fácil, e perde diff legível,
histórico por linha, PR como revisão, e leitura fora do sistema. Também
esconde a fronteira que o produto inteiro existe para preservar: no banco,
captura e conhecimento pareceriam a mesma coisa, e conhecimento vira
subproduto de captura.

**Markdown no mesmo repositório do código (D-04).** Três razões concretas
para separar: cada promoção dispararia build de produção na Vercel; quem quer
o conhecimento no Obsidian não precisa do código; e os históricos de commit
não se misturam.

**Promoção automática por IA.** Barato de implementar e destrói a
propriedade central: se conhecimento nasce sozinho, nada distingue o que
alguém decidiu do que um modelo achou. Mudar isso é `ARCHITECTURE DEVIATION`.

## Consequências

**Bom.** Conhecimento sobrevive ao sistema. Obsidian é só um clone do repo
(D-14). Revisão de conhecimento usa a ferramenta que já existe para revisar
texto.

**Ruim, e assumido.**
- Promoção vira operação distribuída, com falha parcial possível (commit
  feito, linha não gravada). Exige falha segura e E2E de falha.
- Display id (`DEC-0001`) precisa de sequência transacional: com três pessoas
  promovendo, `max()+1` é corrida de verdade (D-08).
- Reindex do zero a partir do Git é **critério de gate**, não item opcional.
- **O repositório de conhecimento precisa nascer privado**, ou a decisão de
  manter o repositório público (2026-09-02, quando ele só tinha código e
  documentação de arquitetura) precisa ser reconfirmada sabendo que o que
  passará a ir para lá é a estratégia dos três.

## Gatilho de revisão

O reindex do zero não fechar na Fase 03, ou a fricção de promover se mostrar
alta o bastante para ninguém promover — nesse caso o problema é a UI de
promoção, e a resposta ainda não é automatizar a decisão.
