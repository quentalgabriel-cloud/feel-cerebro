# Project OS — Execution Kernel v1

Use este documento em TODA fase.

## 1. Protocolo

Toda fase segue:

1. INSPECT
2. RECONCILE
3. PLAN DELTA
4. IMPLEMENT VERTICAL SLICES
5. MIGRATE
6. TEST
7. VISUALLY VERIFY
8. DEPLOY
9. VERIFY PRODUCTION
10. DOGFOOD
11. DOCUMENT
12. CLOSE GATE

## 2. Inspeção obrigatória

Antes de modificar qualquer arquivo:

- leia o repositório;
- identifique versões instaladas;
- leia Architecture, Scope e ADRs;
- leia migrations relevantes;
- identifique funcionalidades existentes;
- verifique deploy atual;
- compare prompt com realidade;
- reutilize código válido;
- identifique regressões possíveis.

Estado real do projeto > suposições antigas.

## 3. Architecture Deviation

Não reabra a arquitetura sem evidência.

Se houver contradição técnica real, registre:

ARCHITECTURE DEVIATION

- Existing decision
- Observed problem
- Evidence
- Impact
- Alternatives
- Recommended change
- Migration consequence

## 4. Atualidade técnica

Para APIs/versões que podem ter mudado, consultar:

1. package/source instalado;
2. documentação oficial;
3. repo oficial;
4. release notes.

Não escrever código moderno a partir de memória desatualizada.

## 5. Dependências

Antes de instalar algo:

- qual problema resolve?
- a stack atual já resolve?
- pertence à fase?
- qual custo operacional?
- ainda será desejável depois?

Se não houver resposta forte: não instalar.

## 6. Progressive Completeness

Não toy MVP.
Não maximalismo.

Construir a versão necessária da capacidade dentro da arquitetura definitiva.

## 7. Vertical slices

Preferir:

UI + Server + Data + Auth + Tests + Observability + Deploy

por capacidade.

## 8. Authority

Nunca criar segunda verdade.

- State → Postgres.
- Auth → Supabase.
- Code/execution → GitHub.
- Deployment → Vercel.
- Durable accepted knowledge → Git-backed Markdown.
- Indexes → derived.

## 9. Epistemologia

SOURCE
≠ CANDIDATE
≠ CANONICAL KNOWLEDGE
≠ INDEX
≠ DERIVED

## 10. AI governance

IA pode extrair, resumir, buscar, sugerir, relacionar, responder.

IA não pode silenciosamente:

- aceitar Decision;
- mudar State;
- promover memória;
- validar Hypothesis;
- fechar blocker;
- alterar permissions.

## 11. Provenance

Toda resposta baseada no projeto deve conseguir mostrar sources.
Se evidence for insuficiente, declarar insuficiência.

## 12. Security

Considerar sempre:

- RLS;
- org/project scope;
- source permissions;
- secrets;
- server-only credentials;
- webhook verification;
- prompt injection;
- XSS;
- uploads;
- cross-project leakage.

## 13. Database

Toda mudança estrutural via migration versionada.
Toda tabela exposta com RLS apropriado.
Testar allow e deny.

## 14. Idempotency

Webhooks, sync, indexing, promotion e jobs precisam ser idempotentes quando reexecução for plausível.

## 15. Failure behavior

GitHub indisponível:
Candidate não é promovido.

AI indisponível:
conhecimento continua acessível.

Embedding indisponível:
FTS continua.

Graph stale:
Memory continua.

Nunca declarar sucesso se authority write falhou.

## 16. Testing

- Unit: regras puras.
- DB: schema/RLS/functions.
- Integration: serviços externos.
- E2E: jornadas críticas.
- AI eval: comportamentos probabilísticos.

## 17. UI verification

Toda mudança visual deve verificar:

- rendering;
- loading;
- empty;
- error;
- interaction;
- responsive relevante;
- console errors.

## 18. Scope control

Oportunidades fora da fase:

NOT NOW
- Idea
- Why relevant
- Why deferred
- Trigger

## 19. Dogfooding

Use cada capacidade no próprio Project OS assim que possível.

## 20. Phase closeout

Entregar:

PHASE RESULT: PASS / PARTIAL / FAIL

IMPLEMENTED
ARCHITECTURE CHANGES
DATABASE CHANGES
UI CHANGES
INTEGRATIONS
TESTS
PRODUCTION
DOGFOOD
KNOWN LIMITATIONS
NOT NOW
NEXT PHASE PRECONDITIONS
ARTIFACTS

Exit Gate falhou → não fingir conclusão.
