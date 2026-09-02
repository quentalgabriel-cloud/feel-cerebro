# Prompt 99 — Project OS V1 Final Adversarial Audit

Use `00_CONTEXT_ARCHITECTURE.md` e `00_EXECUTION_KERNEL.md`.

## Missão

Auditar o Project OS V1 como produto real e decidir:

> Ele resolve o problema que justificou sua construção ou apenas acumulou arquitetura e interfaces sofisticadas?

Não implementar novas features durante a auditoria, exceto correções bloqueadoras claramente identificadas e necessárias para validar o produto.

## 1. Architecture integrity

Verificar:

- Authority by domain respeitada?
- Alguma entidade tem duas verdades?
- Source/Memory/Index continuam separados?
- indexes reconstruíveis?
- Git knowledge realmente canônico?
- State realmente Postgres?
- GitHub/Vercel continuam authorities operacionais?
- AI silenciosamente virou authority em algum ponto?

## 2. Scope integrity

Verificar se produto virou:

- task manager genérico
- Notion clone
- RAG chat
- graph toy
- agent orchestrator

Se sim, identificar escopo inflado.

## 3. Core value audit

### STATE
O usuário sabe onde está?

### MEMORY
O usuário encontra o que foi decidido/sabido?

### TRACE
Consegue explicar por que existe?

### CONTINUITY
Consegue retomar corretamente?

Classificar PASS/PARTIAL/FAIL.

## 4. TTRC test

Escolher projeto dogfood real.

Simular retorno após ausência.

Medir:
- tempo para entender estado
- tempo para descobrir próximo passo
- número de telas/ações
- necessidade de procurar fora do Project OS

## 5. Decision retrieval

Perguntar por decisões históricas reais.

Avaliar:
- tempo
- correctness
- provenance
- supersession
- evidence.

## 6. Retrieval audit

Usar eval set.

Avaliar:
- relevant sources
- false positives
- false negatives
- semantic quality
- source permissions
- no-answer behavior

## 7. Graph audit

Pergunta:

> O Focus Graph resolveu alguma pergunta mais eficientemente do que lista/search?

Testar:
- Why
- Dependencies
- Evidence
- Implementation
- History

Se não: graph precisa ser simplificado/reavaliado.

## 8. Context Pack audit

Comparar:
A. auto retrieval
B. full project context
C. curated Context Pack

Avaliar:
- answer quality
- context size
- user effort
- reproducibility
- citations
- hallucination.

Decidir:
KEEP / REDESIGN / DEFER.

## 9. AI audit

Verificar:
- parsing útil?
- Resume synthesis grounded?
- Ask grounded?
- detections úteis ou ruidosas?
- context compiler melhora agent cold-start?
- costs observáveis?
- fallback sem IA?

## 10. Maintenance burden

Medir:

> Quanto trabalho manual Project OS exige para permanecer correto?

Listar:
- checkpoints
- relations
- promotion
- source registration
- Context Packs
- corrections

Determinar se custo de manutenção ameaça proposta de valor.

## 11. Federated source audit

Verificar:
- Source Registry coerente
- GitHub
- Knowledge Store
- uploads
- local/Git bridge se existente
- versions
- permissions
- stale detection

Pergunta:
> A federação simplificou ou criou sync hell?

## 12. Security audit

- RLS
- project leakage
- source leakage
- GitHub credentials
- prompt injection
- malicious Markdown
- secret indexing
- agent scope

## 13. Reliability audit

Executar ou revisar:
- provider outages
- webhook duplicates
- reindex
- reconciliation
- failed promotion
- embeddings fallback
- malformed source

## 14. UX audit

- NOW hierarchy
- NEXT <= 3
- NOT NOW
- Resume clarity
- Memory canonical/candidate distinction
- Explore complexity
- source inspector
- loading/error/empty
- responsive essentials

## 15. Red Team

Tente remover features.

Para cada grande capability:
- que problema resolve?
- quem usa?
- qual evidence de valor?
- o que quebra se remover?
- custo de manutenção?

Candidatos:
- Graph
- Context Pack
- Run Cards
- AI detection
- semantic retrieval
- local source support

## 16. Future architecture triggers

Verificar se algum trigger realmente ocorreu para:

- Graph DB
- dedicated queue
- dedicated worker
- QMD adapter
- Graphify
- Local Companion
- cross-project intelligence
- multi-agent

Não adotar se trigger não ocorreu.

## 17. Final output

### PRODUCT VERDICT
PASS / CONDITIONAL PASS / FAIL

### CORE
STATE:
MEMORY:
TRACE:
CONTINUITY:

### KEY METRICS
TTRC:
Decision Retrieval:
Context Maintenance Cost:
Source Attribution:
Retrieval:
Agent Cold-start:

### KEEP

### REDESIGN

### REMOVE

### DEFER

### ARCHITECTURAL DEBT

### PRODUCT DEBT

### SECURITY BLOCKERS

### NEXT V1.1 PRIORITIES
Máximo 5.

### V1 COMPLETE?
YES / NO

Só responder YES se produto real cumprir a promessa central com custo de manutenção aceitável.
