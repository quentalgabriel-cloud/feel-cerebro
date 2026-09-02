# Project OS — Prompt Kit de Implementação

Este pacote foi preparado para ser usado como **contexto inicial em um novo chat no ChatGPT Work**.

## Objetivo

Evitar que cada rodada reinterprete a arquitetura do Project OS. O kit separa:

1. **contexto arquitetural congelado**;
2. **constituição de execução**;
3. **planejamento definitivo**;
4. **execução fase a fase**;
5. **auditoria final V1**.

## Ordem recomendada

1. Anexe **todo este ZIP** ao novo chat no Work.
2. Comece pedindo ao assistente para ler:
   - `00_CONTEXT_ARCHITECTURE.md`
   - `00_EXECUTION_KERNEL.md`
   - `00_IMPLEMENTATION_PLAN_FREEZE.md`
3. Execute primeiro o `00_IMPLEMENTATION_PLAN_FREEZE.md`.
4. O resultado deve congelar o roadmap definitivo e reconciliar quaisquer pequenas diferenças entre os prompts de fase e o estado real.
5. Depois execute, em sequência:
   - `01_LIVE_FOUNDATION.md`
   - `02_CONTINUITY_CORE.md`
   - `03_FEDERATED_MEMORY.md`
   - `04_RETRIEVAL_AND_ASK.md`
   - `05_TRACE_AND_EXPLORE.md`
   - `06_CONTEXT_ENGINEERING.md`
   - `07_EXECUTION_INTELLIGENCE.md`
   - `08_AGENT_CONTINUITY.md`
   - `09_SIGNALS_AND_V1_HARDENING.md`
6. Ao terminar, execute:
   - `99_V1_FINAL_AUDIT.md`

## Regra de precedência

Se houver conflito:

1. Estado real do repositório / produção.
2. `00_CONTEXT_ARCHITECTURE.md`
3. ADRs já aceitos no projeto.
4. `00_EXECUTION_KERNEL.md`
5. Prompt específico da fase.
6. Ideias históricas ou sugestões antigas.

Uma fase só pode mudar a arquitetura congelada se encontrar **contradição técnica comprovada** e registrar formalmente um `ARCHITECTURE DEVIATION`.

## Filosofia

- Web-first.
- Vercel desde o início.
- Supabase/Postgres como core operacional.
- Git-backed Markdown para conhecimento durável aceito.
- Fontes federadas, não armazenamento central obrigatório.
- Source Registry como camada central.
- IA sugere; humano governa conhecimento canônico.
- Graph capability cedo; graph database apenas se houver necessidade real.
- Cada fase deve entregar software funcional, publicado, testado e utilizável.
