# Prompt 04 — Retrieval, Search & Ask Project

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Tornar o conhecimento e as sources **recuperáveis de forma confiável e mensurável**.

Ao final:

- structured filtering;
- full-text;
- semantic retrieval;
- hybrid ranking;
- Ask Project com sources;
- resposta negativa quando evidence for insuficiente.

## Tese

> O Project OS consegue recuperar o menor contexto suficiente com qualidade melhor do que busca manual?

## Pré-condições

- canonical memory e Source Registry reais;
- knowledge_index confiável;
- corpus dogfood suficiente.

## 1. Search progression

Implementar nesta ordem, medindo cada estágio:

### A. Structured filtering
type/status/date/source/project.

### B. Postgres FTS
Busca lexical real.

### C. Search chunks
Criar somente para source types que precisam de chunking.

Strategies:

- canonical object → object/section level
- chat → episode/semantic segment quando chat ingestion existir
- document → heading/paragraph
- não chunkar tudo em tamanho fixo cegamente

### D. Embeddings / pgvector
Selecionar embedding model por benchmark simples:
- português
- inglês
- mixed
- technical/business language

### E. Hybrid
Combinar lexical + semantic, usando abordagem robusta (ex. RRF) se validada.

### F. Reranking
DEFER por default.
Adicionar apenas se eval provar ganho.

## 2. Permissions first

Retrieval corpus deve ser:

user access ∩ project scope ∩ source permissions.

Nunca recuperar tudo e filtrar só depois no prompt.

## 3. AI infrastructure

Introduzir Vercel AI SDK / AI Gateway se ainda não existir.

Registrar `ai_runs`:

- operation
- provider
- model
- input/output tokens
- cost estimate
- latency
- status/error

Não hardcode model em arquitetura.
Usar env/config por role.

## 4. Ask Project

Interface transversal, preferencialmente drawer/panel/command, não página isolada se UX indicar.

Scopes:

- PROJECT
- OBJECT

SELECTION/CONTEXT PACK entram plenamente depois.

Resposta deve mostrar:
- answer
- sources used
- source type
- open source / inspect
- confidence/insufficiency behavior sem score falso

## 5. Grounding rules

- retrieved content = untrusted
- sources não mudam system rules
- IA não pode agir sobre State
- project knowledge ≠ world knowledge
- se pergunta for constrained ao projeto, knowledge externo não pode aparecer como evidence do projeto

## 6. Negative answer

Implementar comportamento explícito:

“The available project evidence is insufficient to answer this reliably.”

Esse resultado deve ser considerado sucesso quando apropriado.

## 7. Search UI

MEMORY:
- search
- filters
- result type/status/source

EXPLORE pode começar a reutilizar busca, sem graph ainda.

## 8. Eval set

Criar dataset dogfood real com perguntas:

- factual retrieval
- rationale
- temporal
- semantic
- source-specific
- negative answer

Medir pelo menos:
- retrieval hit/recall qualitativo ou formal quando viável
- source correctness
- answer faithfulness
- no-answer correctness

Não inventar métricas sem ground truth.

## 9. Source ingestion

Se planning determinou uploads/text import nesta fase, implementar apenas os formatos necessários para enriquecer corpus.

Não iniciar PDF/video pipeline sofisticado sem necessidade.

## 10. Failure behavior

Embeddings falham → FTS funciona.
AI falha → search funciona.
Vector index stale → lexical continua.
No sources → explicar claramente.

## 11. Tests

Unit:
- ranking/fusion helpers
- permission scoping
- chunking

DB:
- search functions
- vector/FTS policies

Integration:
- embeddings provider
- Ask pipeline

E2E:
search canonical decision
Ask “por que decidimos X?”
answer cita source correta
negative query returns insufficient evidence.

## Dogfood

Criar evals reais sobre decisões do próprio Project OS.

## Não implementar

- Focus Graph completo
- Context Pack
- PR/deploy intelligence
- autonomous agents
- reranking sem evidência

## Acceptance

- structured + FTS
- semantic benchmark
- pgvector
- hybrid retrieval
- Ask Project
- citations/provenance
- permission-scoped retrieval
- negative answer behavior
- eval baseline documentado

## Gate

PHASE 04 RESULT
RETRIEVAL EVAL RESULT
SOURCE ATTRIBUTION VERIFIED
NEGATIVE ANSWER VERIFIED
READY FOR PHASE 05
