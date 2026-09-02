# Prompt 05 — Trace, Relations & Explore

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Transformar relações e provenance em uma **interface operacional de investigação**.

Ao final, o usuário deve conseguir partir de um objeto e responder visualmente:

- Why does this exist?
- What supports it?
- What contradicts it?
- What depends on it?
- What implemented it?
- What superseded it?
- What came before/after?

## Tese

> Relações estruturadas e Focus Graph reduzem o esforço de reconstruir rationale e dependências?

## Pré-condições

- canonical knowledge
- provenance
- source registry
- retrieval
- relation vocabulary congelado

## 1. relation_index

Criar/profissionalizar tabela DERIVED para relações.

Campos:

- id
- project_id
- source_entity_id
- target_entity_id
- relation_type
- origin
- status
- confidence nullable
- evidence/source refs
- created_at

Canonical explicit relations são projetadas do Markdown.

Structural relations podem vir de fontes determinísticas.

Semantic e inferred não são canonical.

## 2. Relation origin UX

Visualmente distinguir:

- explicit
- structural
- semantic
- inferred

Inferred relation precisa de ação de Review/Confirm se for virar canonical.

## 3. Graph queries first

Antes de UI, implementar queries reais:

- Why?
- Evidence
- Dependencies
- Implementation
- Supersession/History
- Impact

Não criar graph genérico sem queries.

## 4. Focus Graph

Usar React Flow ou componente escolhido no planning.

Default:
- entity central
- 1–2 hops
- filtros
- relation types
- origin
- type/status
- expand selectively

Evitar canvas com tudo.

## 5. Node model

Node é projection da entidade existente.
Não duplicar object model.

Mostrar:
- type
- title
- status
- source/authority cue

## 6. Edge model

Edge:
- relation type
- origin
- confidence only for noncanonical suggestions
- evidence inspector

## 7. Explore Workspace

Unificar:

- Search
- Focus Graph
- Filters
- Source Inspector
- entity detail

Evitar UX de ferramenta técnica de graph DB.

## 8. Source Inspector V1

Expandir:
- canonical object
- source
- exact locator/version
- backlinks
- related entities
- provenance path
- Git commit when relevant

## 9. Global Graph

DEFER por default.
Só implementar se custo marginal baixo e claramente marcado advanced.
Focus Graph é requisito.

## 10. AI relation suggestions

Pode adicionar sugestões se:
- corpus suficiente;
- provenance preservada;
- human review;
- não cria ruído.

Se não houver benefício claro: DEFER.

## 11. Dogfood

Selecionar uma decisão arquitetural real e reconstruir:

Source/Evidence → Hypothesis → Decision → Spec → implementation reference quando existir.

Registrar quanto tempo levou e se graph ajudou.

## 12. Tests

Unit:
- graph query builders
- relation projection
- inverse/validation rules

Integration:
- Markdown → relation_index
- source relation projection

E2E:
Decision detail → Explore → Why → evidence/source → back.

Visual:
- graph interaction
- selection
- empty states
- performance em subgrafo real

## Não implementar

- Neo4j/Graphiti
- giant global graph as default
- Context Pack completo (próxima fase)
- automatic canonical relation inference

## Acceptance

- relation_index
- origin distinction
- Focus Graph
- real graph queries
- Source Inspector
- provenance path
- dogfood trace

## Gate

PHASE 05 RESULT
TRACE SCENARIO VERIFIED
FOCUS GRAPH USEFULNESS
GRAPH DB REQUIRED? expected NO
READY FOR PHASE 06
