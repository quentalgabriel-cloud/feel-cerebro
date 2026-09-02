# ADRs

Decisão de arquitetura registrada é decisão que ainda existe daqui a seis
meses. Decisão revisada em silêncio some — e ninguém sabe mais se foi escolha
ou acidente.

## O formato

Cada ADR responde cinco perguntas, nesta ordem: **contexto** (o que forçou a
decisão), **decisão** (uma frase), **alternativas** (e por que foram
descartadas — esta é a parte que costuma faltar e é a mais útil depois),
**consequências** (o bom e o ruim, honestamente) e **gatilho de revisão** (o
que faria isto ser reconsiderado).

Um ADR não se edita para mudar de ideia: escreve-se um novo que o **supera**,
e o antigo fica marcado como superado. O histórico é o ponto.

## Os registros

| # | Decisão | Estado |
|---|---|---|
| [0001](0001-web-first.md) | Web first, sem app nativo | Aceito |
| [0002](0002-authority-by-domain.md) | Autoridade por domínio | Aceito |
| [0003](0003-supabase-operational-core.md) | Supabase como núcleo operacional | Aceito |
| [0004](0004-git-backed-durable-knowledge.md) | Conhecimento durável versionado no Git | Aceito, não implementado (Fase 03) |
| [0005](0005-graph-without-graph-database.md) | Grafo sem graph database | Aceito |
| [0006](0006-email-e-senha-no-lugar-do-magic-link.md) | Email e senha no lugar do magic link | Aceito |
| [0007](0007-falha-visivel-em-server-action.md) | Falha de Server Action é visível | Aceito |

Os cinco primeiros são os ADRs mínimos que o `docs-kit/01_LIVE_FOUNDATION.md`
exige. Os dois últimos registram decisões tomadas durante a execução — a
troca de autenticação e a convenção de erro nasceram de bugs reais, não de
planejamento, e é por isso mesmo que precisam estar escritas.

As **16 decisões congeladas** (D-01..D-16) do
`../../MASTER-IMPLEMENTATION-PLAN.md` continuam sendo a fonte para o plano de
fases; os ADRs aqui explicam as decisões estruturais que atravessam todas
elas. Contrariar uma D-xx exige `ARCHITECTURE DEVIATION` formal, não um ADR
novo escrito no susto.
