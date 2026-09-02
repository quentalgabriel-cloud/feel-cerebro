# Prompt 07 — Execution Intelligence, WORK & Run Cards

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Conectar reasoning/memory do Project OS à **realidade de execução** em GitHub e Vercel sem transformar o produto em Jira.

Ao final, WORK deve mostrar o que está sendo construído, evidência real de execução e a relação entre spec/decision/code/deploy.

## Tese

> O Project OS consegue conectar WHY/STATE/MEMORY à implementação real sem duplicar GitHub?

## Pré-condições

- canonical knowledge/specs
- Source Registry
- Events
- Relations
- GitHub App base

## 1. GitHub execution adapters

Expandir permissões somente conforme necessário:

- repo metadata
- branches
- commits
- PRs
- issues se realmente usados
- checks/status

GitHub continua authority.

Project OS guarda refs/cache derivado.

## 2. Webhooks

Processar eventos relevantes:
- push
- pull_request
- check_suite/status quando necessário

Idempotent.
Persistir integration event.
Ter reconciliation.

## 3. Vercel deployment intelligence

Vercel já é hosting.
Agora integrar:
- deployment
- preview URL
- production deployment
- build status se acessível via integração escolhida

Vercel continua authority.

## 4. WORK page

Não Kanban.

Mostrar:

- Current Objective
- Active Spec
- Next Expected Action
- execution status
- related Decision
- PR/commits
- tests/checks
- latest deployment
- blockers/signals pertinentes

## 5. Spec ↔ execution

Criar relações:
- implements
- mentions
- depends_on quando determinístico

Não inferir sem evidência.

Permitir ligar manualmente PR/Spec quando automação não sabe.

## 6. What Changed enrichment

NOW/Resume passa a incluir:
- PR merged
- checks
- deploy
- branch activity

Filtrar ruído.

## 7. Run Cards

Introduzir objeto operacional.

Campos:

- task
- agent/model nullable
- context refs
- source refs
- tools
- output summary
- changes
- artifacts
- verification
- warnings
- token/cost when AI
- created_at

Inicialmente Run Cards podem representar execuções conduzidas/registradas pelo Project OS ou importadas quando há dados confiáveis.

Não inventar detalhes ausentes.

## 8. Trace extension

Exemplo esperado:

Evidence
→ Decision
→ Spec
→ PR
→ Deploy

Focus Graph deve conseguir atravessar esses domínios.

## 9. Project Resume

Enriquecer deterministicamente com execution events.

## 10. Failure behavior

GitHub API down:
- cached execution visible com stale indicator
- State/Memory funcionam

Webhook missed:
- reconciliation restaura.

Vercel unavailable:
- Work não perde demais dados.

## 11. Tests

Integration:
- GitHub auth
- webhook signatures
- PR/commit ingestion
- idempotency
- Vercel event/data ingestion

E2E:
Spec → link PR → merge → Work/Resume update → Deploy visible.

Security:
GitHub token/key server-only.

## Dogfood

Usar PRs e deploys reais do Project OS.
Criar pelo menos um trace real Spec → PR → Deploy.

## Não implementar

- issue tracker próprio
- generic task board
- autonomous coding agent
- multi-agent orchestration

## Acceptance

- WORK útil
- GitHub execution real
- Vercel deployment state real
- Run Cards
- Resume enriched
- Spec ↔ PR ↔ deploy trace
- reconciliation

## Gate

PHASE 07 RESULT
GITHUB AUTHORITY VERIFIED
WORK VALUE VERIFIED
EXECUTION TRACE VERIFIED
READY FOR PHASE 08
