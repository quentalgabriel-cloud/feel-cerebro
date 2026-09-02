# Prompt 06 — Context Engineering & Context Packs

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Transformar Search + Graph + Sources em uma ferramenta de **composição explícita de contexto para IA**.

Ao final:

select → constrain → inspect → save Context Pack → Ask/Compare/Synthesize using only selected context.

## Tese

> Contexto curado e source-aware produz respostas mais precisas, rastreáveis e econômicas do que enviar “o projeto inteiro” ou depender apenas de retrieval automático?

## Pré-condições

- Search/Ask
- Source Registry
- Focus Graph
- permissions
- provenance

## 1. Context Workspace

A partir de:
- search results
- graph nodes
- memory list
- source inspector

permitir adicionar à seleção.

Mostrar:
- selected entities/sources
- types
- versions
- authority
- estimated context size/tokens
- permission status

## 2. Context Pack semantics

Seguir decisão do planning freeze.

Preferência arquitetural:
- Snapshot Pack para análise reproduzível;
- Live Collection opcional apenas se explicitamente prevista.

Snapshot deve pin:
- entity/source IDs
- versions/hashes/commit SHA
- filters
- relation depth
- creation purpose
- created_at/by

Não copiar conteúdo canônico desnecessariamente.

## 3. Filters / constraints

Suportar somente filtros de valor real:

- type
- status
- source/provider
- date
- relation origin
- relation depth
- exclude superseded
- canonical only
- include/exclude chats

Não criar query builder enterprise.

## 4. Constrained Ask

Modo:

USE ONLY THIS CONTEXT PACK

Requisitos:
- retrieval não amplia corpus;
- project/world external knowledge não é apresentado como evidence;
- sources usados aparecem;
- insuficiência é declarada;
- system instructions continuam fora do untrusted context.

## 5. Actions

Implementar progressivamente:

- Ask
- Compare
- Synthesize
- Create Candidate Hypothesis

`Create Candidate Hypothesis` nunca cria canonical Hypothesis.

## 6. Context Pack UI

- name
- purpose
- selected items
- scope summary
- token estimate
- saved timestamp
- snapshot/live semantics explícitas
- sources/version details

## 7. Context efficiency eval

Criar teste:

A. broad project retrieval
B. auto retrieval
C. curated Context Pack

Comparar:
- source accuracy
- answer faithfulness
- token size
- cost
- hallucination/irrelevant context
- user effort

Não concluir superioridade antecipadamente.

## 8. Graph selection

No Focus Graph:
- multi-select
- isolate selected
- add to context

Não transformar graph em editor de flowchart.

## 9. Provenance

Context Pack deve permitir responder:
- why item included
- which version
- where source lives

## 10. Context to Candidate

Synthesis pode gerar:
- Candidate Hypothesis
- Candidate Question
- Candidate Decision suggestion

Nunca promover automaticamente.

## 11. Tests

Unit:
- snapshot resolution
- context scope enforcement
- token estimation helper
- permission validation

DB:
- context_packs
- context_pack_items
- RLS

E2E:
select 3 sources → save pack → constrained ask → citations only from pack → create candidate.

Security:
attempt source outside permission → blocked before context generation.

## Dogfood

Criar um Context Pack real para uma decisão de arquitetura do Project OS.
Comparar com auto retrieval.

## Não implementar

- autonomous research agent
- multi-agent debate
- graph DB
- generic workflow builder

## Acceptance

- Context Workspace
- saved Context Pack
- source/version pinning
- constrained reasoning
- Compare/Synthesize
- Candidate creation
- eval auto vs curated
- permission enforcement

## Gate

PHASE 06 RESULT
CONTEXT PACK EVAL
CONSTRAINED SCOPE VERIFIED
CONTEXT EFFICIENCY FINDING
READY FOR PHASE 07
