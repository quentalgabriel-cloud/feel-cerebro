# Prompt 09 — Project Signals & V1 Hardening

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Transformar o sistema construído em um **V1 coerente, confiável, observável e seguro**, adicionando signals somente onde há evidence real.

## Tese

> O Project OS já consegue manter humano e agentes intelectualmente no controle de um projeto real com custo de manutenção aceitável?

## Pré-condições

Phases 01–08 com gates satisfatórios ou desvios documentados.

## 1. Signal catalogue

Implementar apenas sinais acionáveis.

### Deterministic candidates

- NOW missing
- stale checkpoint
- unresolved Decision blocking active Spec
- superseded Decision still referenced
- active Spec with merged implementation but stale status
- production changed after last checkpoint
- failed/repeated sync
- stale knowledge index
- source permission/index mismatch

### AI-assisted candidates

- possible contradiction
- stale assumption
- Hypothesis may lack evidence
- documentation meaning may drift from implementation

Cada Signal:
- condition
- evidence
- deterministic/AI
- action
- lifecycle
- severity somente se útil

Sem Health Score.

## 2. Decision Debt / Context Debt

Representar como explicações/sinais, não score.

Decision Debt exemplos:
- implementation without rationale/Decision
- conflicting active Decisions
- superseded reference

Context Debt:
- State/history divergindo
- checkpoint muito antigo
- execution mudou sem reorientation artifact

## 3. Reconciliation

Criar/validar ferramentas seguras para:

- Re-index knowledge
- Re-sync GitHub
- Rebuild relations
- Recompute embeddings
- verify source registry

Podem ser admin/internal; não precisam virar UI pública sofisticada.

## 4. Reliability audit

Testar failure modes:

- GitHub outage
- Vercel integration failure
- AI unavailable
- embedding provider unavailable
- stale webhook
- malformed Markdown
- duplicate webhook
- failed promotion
- unauthorized source

## 5. Security hardening

Auditar:

- RLS
- server-only secrets
- GitHub App permissions
- webhook signatures
- XSS/Markdown sanitization
- uploads
- secret detection/indexing
- source permission leakage
- cross-project retrieval
- prompt injection boundaries
- agent context scoping

Adicionar controles somente onde gap real existir.

## 6. Observability

Revisar:

- Vercel logs
- Supabase logs
- integration errors
- AI runs/cost
- sync health
- reconciliation status

Adicionar ferramenta externa somente se lacuna operacional real justificar.

## 7. Performance

Avaliar:
- NOW load
- Memory search
- Focus Graph
- Context Pack creation
- Ask streaming
- source inspector

Otimizar bottlenecks reais, não hipotéticos.

## 8. UX hardening

Revisar:
- loading
- empty
- error
- permissions
- mobile/responsive essencial
- keyboard
- command palette se aprovada
- clarity de canonical/candidate/inferred

Não redesign completo.

## 9. Metrics

Medir no dogfood:

### TTRC
tempo para reconstruir contexto.

### Decision Retrieval Time

### Context Maintenance Cost

### Source Attribution Accuracy

### Retrieval Quality

### Context Pack Efficiency

### Agent Cold-start

Não inventar targets impossíveis; registrar baseline e melhoria.

## 10. Dogfood scenario suite

Executar cenários:

A. voltar após vários dias
B. explicar por que feature existe
C. comparar três fontes
D. excluir chat antigo
E. usar local/Git knowledge
F. detectar spec/execution drift
G. novo agent session
H. hipótese somente com selected sources

Registrar PASS/PARTIAL/FAIL.

## 11. Documentation final

Atualizar:

- README
- ARCHITECTURE
- DATA MODEL
- SECURITY
- TESTING
- ADRs
- OPERATIONS/RECONCILIATION
- V1 scope

## 12. Do Not Build audit

Confirmar que não entraram indiretamente:

- graph DB
- microservices
- multi-agent framework
- Notion/Jira clone
- event sourcing
- QMD web runtime
- generic workflow builder

## Acceptance

- signals úteis
- no fake score
- reconciliation
- security audit
- failure tests
- performance review
- UX states
- metrics baseline
- dogfood scenario suite
- docs atualizadas

## Gate

PHASE 09 RESULT
SECURITY: PASS/PARTIAL/FAIL
RELIABILITY: PASS/PARTIAL/FAIL
DOGFOOD SUITE
V1 READY FOR FINAL AUDIT: YES/NO
