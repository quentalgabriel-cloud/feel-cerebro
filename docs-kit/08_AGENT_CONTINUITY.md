# Prompt 08 — Agent Continuity & Context Compiler

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Permitir que um novo agente de coding/reasoning continue um projeto com **bounded context confiável**, sem precisar reconstruir manualmente todo o histórico.

## Tese

> O Project OS reduz o cold-start de agentes usando State + Memory + Trace + Context em um pacote pequeno e rastreável?

## Pré-condições

- Project State
- canonical Memory
- Retrieval
- Context Packs
- execution data

## 1. Context Compiler

Gerar package contendo, conforme relevância:

- Project identity
- Objective
- Current State
- NOW
- NEXT
- Active Spec
- Accepted Decisions
- Constraints
- Relevant Evidence
- Open Questions
- Recent Changes
- Next Expected Action
- Relevant Files/PR refs
- latest Checkpoint
- provenance map

O compiler deve ser determinístico em estrutura e configurável em conteúdo.

## 2. Output formats

Implementar pelo menos:

### Markdown
`context.md`

### Structured JSON
para futuras integrações.

Não criar protocolo complexo.

## 3. Context selection

Inputs possíveis:
- auto relevant context
- saved Context Pack
- current object
- current work item

Mostrar exatamente o que será enviado.

## 4. Size/budget

Calcular estimativa de tokens/context.
Aplicar orçamento.
Não truncar silenciosamente.

Quando exceder:
- priorizar State/Spec/Decisions;
- avisar;
- permitir revisar.

## 5. Continue With AI UI

Mostrar:

- context objects count
- active decisions
- spec
- open questions
- latest checkpoint
- token estimate

Actions iniciais:
- Copy context
- Download Markdown
- Download JSON

Integrações diretas entram somente se simples e suportadas.

## 6. Codex / Claude Code

Avaliar integração atual real.

Se houver mecanismo oficial/simples:
- adicionar “Open/Use with …”

Se exigir hacks/desktop automation:
- não implementar;
- manter copy/download.

## 7. MCP gate

Só introduzir MCP se houver benefício comprovado nesta fase:

- agente precisa consultar dinamicamente Project OS;
- context package estático é insuficiente;
- permission model está claro.

Se não:
DEFER e registrar trigger.

## 8. Run Card integration

Quando um handoff/invocation é registrado:
- Context Pack/package usado
- model/agent
- start/end
- output/artifacts
- verification quando disponível

Não assumir telemetry que não existe.

## 9. Agent permissions

Agent context deve respeitar exatamente:
user/project/source permissions.

Não incluir:
- secrets
- unauthorized sources
- hidden client content

## 10. Prompt injection

Compiler deve separar:
- trusted project rules
- data/source content
- task

Nunca colocar source text como instruction layer.

## 11. Eval

Comparar:

A. agente sem Project OS context
B. full project dump
C. compiled bounded context

Tarefas:
- explicar estado
- identificar próximo passo
- implementar pequena mudança/recomendar plano

Medir:
- correctness
- irrelevant context
- source adherence
- token usage
- reorientation effort

## 12. Dogfood

Gerar contexto real do Project OS e usá-lo para iniciar uma sessão nova de agent work.

## Não implementar

- autonomous multi-agent workflow
- agent marketplace
- generic orchestration engine
- persistent agent memory paralela

## Acceptance

- context.md
- structured JSON
- budget/estimate
- permissions
- provenance
- Continue With AI UI
- agent cold-start eval
- MCP decision documented

## Gate

PHASE 08 RESULT
CONTEXT COMPILER VERIFIED
AGENT COLD-START EVAL
MCP: ADOPT/DEFER + evidence
READY FOR PHASE 09
