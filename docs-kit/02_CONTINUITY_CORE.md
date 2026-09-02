# Prompt 02 — Continuity Core

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Transformar o Project State da fase anterior em uma **experiência real de retomada**.

Ao final, abrir o projeto depois de alguns dias deve responder:

- onde paramos;
- o que mudou;
- o que precisa de atenção;
- qual é o próximo passo;
- qual contexto merece revisão.

## Tese

> O Project OS consegue reduzir concretamente o Time To Reconstruct Context sem depender ainda de memória semântica completa?

## Pré-condições

- Phase 01 PASS.
- Project State funcionando.
- Events reais.
- dogfood Project OS ativo.

## Capacidades

### Continuity Checkpoint

Criar objeto operacional `checkpoints`.

Campos mínimos:

- id
- project_id
- goal
- completed
- changed
- decisions_or_notes (sem fingir canonical knowledge)
- still_open
- next_expected_action
- source_refs quando disponíveis
- created_by
- created_at

Pode usar JSONB para pequenos arrays se validado no planning.

UI:
- gerar/editar checkpoint;
- confirmar antes de salvar;
- histórico simples.

Não criar checkpoint obrigatório a cada sessão.

### Last Seen / Resume Anchor

Registrar último acesso relevante ao Project, preferencialmente sem spam de eventos.
Definir semantics claras.

### Project Resume V0

Determinístico primeiro.

Inputs:

- current Project State;
- last checkpoint;
- events since checkpoint/last meaningful visit;
- Candidates recentes;
- mudanças internas já observáveis.

Sections:

- Welcome back
- NOW
- NEXT
- WHAT CHANGED
- NEEDS ATTENTION
- RECOMMENDED CONTEXT (ainda simples)
- NOT NOW collapsed

Sem fake AI intelligence.

### What Changed

Criar agregação determinística sobre Events.
Deve evitar duplicação e ruído.

### Needs Attention V0

Somente regras determinísticas simples, por exemplo:

- NOW vazio;
- NEXT vazio quando NOW existe;
- checkpoint antigo;
- candidate backlog excessivo apenas se houver regra claramente justificável.

Não criar scores.

### AI Resume — somente se justificável nesta fase

Depois do deterministic Resume funcionar, avaliar adicionar síntese assistida por IA:

- nunca substituir state;
- sempre derivar de dados visíveis;
- registrar `ai_run`;
- permitir fallback sem IA;
- provenance para itens importantes.

Se a camada de IA ainda não estiver arquiteturalmente pronta, DEFER e feche a fase sem forçar.

## Data

Adicionar:

- checkpoints
- talvez project_visit_state / last_seen fields
- ai_runs apenas se realmente usar IA nesta fase

Eventos:

- checkpoint.created
- checkpoint.updated se permitido
- resume.generated somente se útil

## UX

NOW deve virar a tela de reentrada.

Evitar dashboard genérico.

Prioridade visual:

1. NOW
2. What Changed
3. Needs Attention
4. NEXT
5. Recommended Context
6. NOT NOW

## Recommended Context V0

Sem retrieval semântico.

Pode usar:

- latest checkpoint;
- latest candidate;
- recent events;
- linked state artifacts.

Mostrar claramente a natureza limitada dessa recomendação.

## Testes

Unit:
- deterministic Resume assembler
- signal rules
- checkpoint validation

DB:
- RLS checkpoints

E2E:
- create checkpoint
- simulate changes
- reopen project
- Resume reflete mudanças corretas

Dogfood:
- fazer checkpoint real;
- trabalhar/modificar estado;
- retornar e avaliar TTRC.

## Métrica

Registrar benchmark manual inicial:

TTRC BEFORE / AFTER

Não exigir analytics sofisticado.

## Não implementar

- canonical knowledge Git se Phase 03 ainda não entrou
- embeddings
- graph
- Context Pack
- GitHub execution
- AI detection avançada

## Acceptance

- checkpoint real
- Resume determinístico
- What Changed
- Needs Attention sem score artificial
- Recommended Context V0
- TTRC dogfood registrado
- fallback funcional sem IA

## Gate

PHASE 02 RESULT
TTRC DOGFOOD RESULT
CHECKPOINT FLOW VERIFIED
RESUME VERIFIED
READY FOR PHASE 03
