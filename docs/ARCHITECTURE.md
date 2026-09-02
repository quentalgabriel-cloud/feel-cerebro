# Arquitetura

O que o sistema é, e por quê. Decisões pontuais com alternativa descartada
moram em `adr/`; este documento é o mapa que dá sentido a elas.

Escrito no fechamento da Fase 01 (2026-09-03). Vale para o que **existe** —
o que está planejado está em `../MASTER-IMPLEMENTATION-PLAN.md`, e a
diferença entre os dois é intencional.

## 1. O que o software faz

Project OS é a camada persistente de orientação de um projeto: **onde
estamos, o que vem agora, o que fica de fora** — e, adiante, como retomar o
contexto sem reconstruí-lo do zero. "Cérebro da Feel" é o primeiro projeto
rodando dentro dele (D-03).

A pergunta que o sistema existe para responder não é "onde está aquele
arquivo". É **"o que importa agora, e por quê"**.

## 2. Quatro camadas

Vocabulário herdado do Project OS kit, e o que faz a arquitetura não virar
pântano — cada camada tem autoridade própria e não se mistura com as outras:

| Camada | Pergunta | Onde vive hoje |
|---|---|---|
| **STATE** | O que é verdade agora? | `project_state`, `state_items` — Fase 01, funcionando |
| **MEMORY** | O que aprendemos e decidimos? | `candidates` (captura). Conhecimento canônico é Fase 03 |
| **TRACE** | Como chegamos aqui? | `events`, append-only — existe, ninguém atravessa ainda |
| **CONTINUITY** | Como retomar sem reconstruir? | Não existe. É a Fase 02 |

**A fundação está pronta e o edifício mal começou** — e essa é a ordem
certa, porque errar a fundação custa ordens de grandeza mais caro.

## 3. Cinco naturezas de dado

Confundir estas cinco é como sistemas de conhecimento apodrecem:

- **Source** — bruto, imutável, com proveniência (upload, colagem).
- **Candidate** — capturado, esperando decisão humana. Não é conhecimento.
- **Canonical** — Markdown versionado no Git. Só nasce de ato deliberado.
- **Index** — projeção consultável do canônico. **Reconstruível.**
- **Derived** — agregação, resumo, embedding. **Reconstruível.**

Se `Index` ou `Derived` não renascem da fonte, existem duas verdades — e foi
essa régua que aposentou `notas_promovidas` (D-07).

> **Captura é barata e automática. Conhecimento canônico é caro e exige
> decisão humana.** Nada vira conhecimento por acidente. Mudar isso é
> `ARCHITECTURE DEVIATION`, não refinamento.

## 4. Autoridade por domínio

Cada fato tem **um** dono. Os outros guardam referência, nunca cópia da
verdade (ADR-0002).

| Domínio | Autoridade | Consequência |
|---|---|---|
| Estado, tenancy, autorização | **Postgres/Supabase** | RLS decide, não a UI |
| Conhecimento canônico | **Git** (Fase 03) | índice reconstrói do Git, ou o Git não é autoridade |
| Execução: código, deploy | **GitHub, Vercel** | referenciamos SHA e URL, não replicamos |
| Identidade | **Supabase Auth** | `profiles.auth_user_id` aponta; não duplica credencial |

## 5. Stack real

Verificada, não de memória (D-15):

- **Next.js 16.3.3** — App Router, Turbopack. `middleware.ts` virou
  `proxy.ts` nesta versão; a doc real está em `app/node_modules/next/dist/docs/`.
- **React 19.2** — Server Components por padrão; `useActionState` nos formulários.
- **Supabase** — Postgres 17.6 (`sa-east-1`), Auth, Storage, RLS.
- **Vercel** — Hobby, deploy contínuo por Git, Root Directory `app`.
- **Tailwind v4**, **TypeScript strict**.
- **Vitest** para unidade, **Playwright** para E2E, **Postgres descartável**
  para RLS.

## 6. Estrutura

```
app/                      Next.js
  src/app/                rotas (App Router)
  src/components/         UI compartilhada
  src/lib/                regras puras + adaptadores
    action-result.ts      contrato de retorno das Server Actions
    state-rules.ts        NOW=1, NEXT<=3, posições — sem banco
    org-bootstrap.ts      decisão de criar organização — sem banco
    slug.ts               slug de URL
    supabase/             clientes (server/client)
  src/_fase03/            código parado, fora do build (ver §9)
  e2e/                    Playwright, desligado por padrão
supabase/
  migrations/             ordem real de aplicação
  superseded/             migrations superadas, preservadas
  tests/verify.sh         Postgres descartável + suíte de RLS
docs/                     este diretório
docs-kit/                 os prompts de fase originais, preservados como fonte
handoff/                  o que uma thread nova precisa saber
```

Regra de leitura: **`src/lib/*.ts` sem sufixo é lógica pura e testável;
adaptador de banco fica junto de quem usa.** A separação existe porque a
lógica que não dá para testar sem banco só é testada em produção — foi
exatamente assim que o bug do bootstrap de organização passou.

## 7. Autorização

Mora no banco. Sempre.

- Toda tabela tem RLS ativa. ~20 policies.
- Funções que decidem autorização vivem no schema `private`, que o PostgREST
  não expõe — em `public`, `SECURITY DEFINER` vira endpoint RPC público.
- Subquery dentro de policy é **ela mesma filtrada por RLS**. Quando a
  decisão depende de fatos que o usuário não pode ver, a checagem roda em
  função `SECURITY DEFINER`.
- Invariantes de domínio são constraint, não validação de aplicação: NOW = 1
  por índice único parcial, NEXT ≤ 3 por check constraint.

Server Action é endpoint alcançável por POST direto. Validação em componente
é UX; **se a regra não está na RLS ou numa constraint, ela não existe.**

## 8. Falha é parte da interface

Convenção adotada em 2026-09-03, depois de um bug que custou horas:

- Toda Server Action alcançável por formulário devolve `ActionResult`, e o
  formulário mostra a mensagem (`components/action-form.tsx`).
- Erro de **leitura** nunca vira empty state. Página que renderiza "nada
  ainda" quando a query falhou mente com confiança (`components/data-error.tsx`).
- Escrita que falha nunca apaga o que a pessoa digitou.
- Falha de log (`logEvent`) é a única exceção: engole o próprio erro de
  propósito, porque perder uma linha de histórico é menos grave que impedir
  alguém de mexer no NOW.

## 9. Nada é sobrescrito em silêncio

- Migration superada vai para `supabase/superseded/`, não é apagada.
- Código de fase futura fica parado com explicação (`src/_fase03/`), fora do
  `tsconfig` e fora do build.
- Tentativa errada fica documentada no cabeçalho do arquivo que a corrigiu —
  inclusive as que **não** funcionaram, porque a próxima pessoa precisa saber
  por que a solução óbvia não serve.
- Documentação desatualizada é bug. Corrigi-la faz parte da entrega que a
  invalidou.

## 10. O que a arquitetura recusa

Recusas são decisões, e ficam registradas como tal:

- **Sem graph database** (ADR-0005) — Postgres resolve a vizinhança que o
  Focus Graph precisa.
- **Sem IA na Fase 01 e 02** — a Fase 02 existe para medir quanto do valor
  vem só de determinismo. IA antes disso esconde a resposta.
- **Sem promoção automática para conhecimento canônico** — síntese pode criar
  Candidate; nunca promove.
- **Sem autocadastro público** — contas são provisionadas (ADR-0006).
- **Sem service role no caminho do primeiro acesso** — o bootstrap de
  organização é autorizado pela própria RLS (migration 0005).
