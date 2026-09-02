# Escopo

O que está dentro, o que está fora, e o que está fora **por enquanto**. A
terceira coluna é a que costuma faltar em documento de escopo — e é a que
evita a conversa "isso a gente não ia fazer?" seis meses depois.

Estado em 2026-09-03, fim da Fase 01.

## 1. Para quem

Três sócios da Feel: Gabriel, Gabrielle e Axel. **Ferramenta interna, não
produto.** Isso governa decisões reais: conta Vercel gratuita, sem
autocadastro, sem onboarding, sem multi-idioma. O dia em que deixar de ser
protótipo interno é o gatilho para revisar cada uma dessas.

## 2. Dentro do escopo, hoje (Fase 01 — no ar)

- Login por email e senha.
- Multi-tenancy real: organizações, membros, projetos, autorização por RLS.
- `project_state`: objetivo do projeto.
- **NOW = 1, NEXT ≤ 3, NOT NOW ilimitado** — impostos pelo banco.
- Promoção NOT NOW → NEXT.
- Quick Capture (⌘K) de qualquer tela, gravando `candidate`.
- "O que mudou", determinístico, a partir de `events`.
- WORK, MEMORY e EXPLORE com empty states honestos, sem dado falso.
- Cron semanal de keepalive (o plano gratuito do Supabase pausa por
  inatividade).

## 3. Dentro do escopo, planejado

Contratos completos em `../MASTER-IMPLEMENTATION-PLAN.md`. Resumo do que cada
fase promete:

| Fase | Entrega | Pré-condição dura |
|---|---|---|
| **02** Continuity Core | Resume determinístico, checkpoints, TTRC medido | **dogfood real** — sem `events` de uso verdadeiro, mede ruído |
| **03** Federated Memory | Candidate → Markdown canônico no Git, com proveniência | repo de conhecimento separado (D-04) + token de escrita (D-05) |
| **04** Retrieval & Ask | Filtros → FTS → chunks → embeddings → hybrid, medindo cada degrau | corpus canônico existindo |
| **05** Trace & Explore | Focus Graph e mapa por eixos | eixos definidos pelos três **e** corpus real (D-11) |
| **06** Context Engineering | Context Pack como snapshot reprodutível (D-09) | — |
| **07** Execution Intelligence | GitHub App, PRs, checks, Run Cards | GitHub App (D-05) |
| **08** Agent Continuity | Pacote de contexto para agente; portão explícito de MCP | — |
| **09** Signals & Hardening | Sinais, segurança, auditoria de V1 | 01–08 com gate ou desvio documentado |

## 4. Fora do escopo — decidido, não esquecido

- **Graph database.** Postgres dá conta da vizinhança que o Focus Graph
  precisa (ADR-0005).
- **App móvel nativo.** Web responsiva resolve (ADR-0001).
- **Promoção automática de conhecimento por IA.** Síntese pode criar
  Candidate; promover é ato humano. Mudar isso é `ARCHITECTURE DEVIATION`.
- **Autocadastro público.** Três pessoas conhecidas; conta se provisiona
  (ADR-0006).
- **Reranking.** DEFER até a eval da Fase 04 mostrar ganho sobre hybrid (D-13).
- **Live Collection no Context Pack.** Snapshot é o ponto; coleção viva não é
  reproduzível (D-09).
- **Plugin de Obsidian.** Obsidian lê um clone Git do repo de conhecimento,
  sem plugin (D-14).
- **Multi-idioma na UI.** Português, que é o que os três leem. Identificadores
  de schema e de código em inglês (D-16).

## 5. Fora do escopo **por enquanto** — com gatilho nomeado

Esta seção é a que impede decisão revisada em silêncio.

| Item | Estado | O que dispara a revisão |
|---|---|---|
| Vercel Pro / team | Hobby, conta pessoal | Deixar de ser protótipo interno |
| Repositório público | Público, autorizado pelo Gabriel em 2026-09-02 | **A Fase 03 promove conhecimento canônico para um repositório versionado.** Reavaliar antes de a 03 ir ao ar — ou o repo de conhecimento (D-04) nasce privado |
| Recuperação de senha | Não existe; senha é provisionada | Alguém precisar trocar senha sem intervenção. A rota `/auth/callback` já está de pé para isso |
| Papéis builder/viewer na UI | Existem no schema e na RLS, não na interface | Alguém que não seja owner precisar entrar |
| Extração de texto de arquivo | Upload guarda no Storage; texto precisa ser colado | Fase 03, quando `sources` virar registry |
| Eixos da Feel | Tabela vazia **por design** | Os três definirem os eixos reais (D-11) |
| MCP | Portão explícito na Fase 08 | O agente precisar consultar dinamicamente **e** o pacote estático provar-se insuficiente |
| E2E automático em CI | Escrito, desligado por padrão | Existir instância descartável — rodar contra a base real contaminaria os `events` que a Fase 02 vai medir |

## 6. O que "pronto" significa aqui

Uma fase só fecha com o gate do `00_EXECUTION_KERNEL.md` percorrido inteiro:

```
INSPECT → RECONCILE → PLAN DELTA → IMPLEMENT → MIGRATE → TEST →
VERIFY → DEPLOY → VERIFY PRODUCTION → DOGFOOD → DOCUMENT → CLOSE GATE
```

Os dois passos que costumam ser pulados são os que pegam bug: **VERIFY
PRODUCTION** (bater no endpoint e ler a resposta — deploy sem erro não é
prova) e **DOGFOOD** (usar de verdade, com dado real).

O veredito da Fase 01 está em `GATE-FASE-01.md`.
