# Prompt 00 — Master Implementation Plan Freeze

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Transforme `00_CONTEXT_ARCHITECTURE.md` em um **MASTER IMPLEMENTATION PLAN v1** definitivo.

Não implemente código nesta rodada.

Feche:

- DAG de capacidades;
- critical path;
- fases;
- knowledge store topology inicial;
- Project State schema;
- Source Registry V1;
- Candidate lifecycle;
- Markdown schema V1;
- relation subset V1;
- adapters iniciais;
- Context Pack semantics;
- progression de search/AI/GitHub/Vercel;
- database evolution;
- routes;
- dogfooding;
- testing;
- security;
- exit gates.

## Regra

Não reabrir arquitetura congelada sem contradição técnica comprovada.

## Capability classification

Para cada capacidade:

- FOUNDATION
- CORE
- ENABLER
- DIFFERENTIATOR
- MATURITY
- FUTURE

Avalie qualitativamente:

- User Value
- Dependency
- Risk Reduction
- Learning Value
- Cost

## Risk-first

Garanta teste cedo para:

- Git-backed promotion;
- federated source identity;
- RLS/scoping;
- indexing;
- retrieval quality;
- graph usefulness;
- Context Pack usefulness.

## Value-first

Primeira versão funcional não pode ser apenas login/sidebar.

Precisa entregar orientação real:

- project;
- objective;
- NOW;
- NEXT;
- NOT NOW;
- Quick Capture.

## Fases

Use como hipótese e reorganize se necessário:

01 Live Foundation
02 Continuity Core
03 Federated Memory
04 Retrieval & Ask
05 Trace & Explore
06 Context Engineering
07 Execution Intelligence
08 Agent Continuity
09 Signals & V1 Hardening

## Para cada fase

Produza:

- NAME
- THESIS
- STRATEGIC PURPOSE
- USER VALUE
- LEARNING QUESTION
- PRECONDITIONS
- DEPENDENCIES
- CAPABILITIES
- VERTICAL SLICES
- UI
- ROUTES
- DATA MODEL
- MIGRATIONS
- AUTHORIZATION
- SOURCE MODEL
- AI
- RETRIEVAL
- GRAPH
- INTEGRATIONS
- OBSERVABILITY
- TESTING
- DOGFOOD
- DOCUMENTATION
- FAILURE MODES
- RISKS
- OUT OF SCOPE
- ACCEPTANCE CRITERIA
- EXIT GATE
- COMPLEXITY S/M/L/XL
- RISK LOW/MEDIUM/HIGH
- WHAT NEXT PHASE INHERITS

## Database evolution

Tabela:

TABLE | AUTHORITY | CANONICAL/DERIVED | PHASE | RLS MODEL

## Route evolution

Mapear:

/projects
/p/[project]/now
/p/[project]/work
/p/[project]/memory
/p/[project]/memory/[id]
/p/[project]/explore
/p/[project]/context/[id]
/p/[project]/settings

## Dogfooding

Defina progressão explícita do próprio Project OS.

## Outputs finais

1. Executive Implementation Strategy
2. Closed Operational Decisions
3. Capability Matrix
4. Dependency DAG em Mermaid
5. Final Phase Map
6. Detailed Phase Contracts
7. Database Evolution
8. Route/UI Evolution
9. Integration Evolution
10. AI/Retrieval/Graph Evolution
11. Dogfood Roadmap
12. Risk Register
13. primeiros 40–60 movimentos concretos
14. `PHASE X — EXECUTION INPUT CONTRACT` para cada fase

## Final Gate

IMPLEMENTATION PLAN: PASS / FAIL
ARCHITECTURE REOPENED: YES / NO
READY FOR PHASE PROMPTS: YES / NO
BLOCKERS: ...

Esperado:
PASS / NO / YES / NONE.
