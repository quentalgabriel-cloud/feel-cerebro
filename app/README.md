# Cérebro da Feel — app (Fase 01)

Next.js 16 (App Router + Turbopack) + TypeScript + Tailwind v4 + Supabase
(`@supabase/ssr`). Implementa a **Fase 01 — Live Foundation** do
`../MASTER-IMPLEMENTATION-PLAN.md`: a camada de orientação, multi-tenant,
com autorização no banco.

No ar em https://feel-cerebro.vercel.app — deploy contínuo a cada push em
`main` (Root Directory do projeto Vercel = `app`).

## O que existe

- **`/login`** — email e senha (`signInWithPassword`). Não há magic link
  desde 2026-09-02, e não há autocadastro: contas são provisionadas. O porquê
  está em `../docs/adr/0006-email-e-senha-no-lugar-do-magic-link.md`.
- **`/projects`** — lista os projetos de que você é membro e cria projeto
  novo. Perfil e organização pessoal são criados sozinhos, sob RLS, sem
  service role — e a checagem roda em **todo** carregamento, não só no
  primeiro login (ver `src/lib/org-bootstrap.ts` e o bug que isso corrigiu).
- **`/p/[slug]/now`** — a tela que justifica o sistema: **um** NOW, no
  máximo **três** NEXT, o resto em NOT NOW, mais "o que mudou" lido de
  `events`. Os limites são impostos pelo banco (índice único parcial e
  check constraint); a aplicação valida antes só para dar mensagem decente.
- **Quick Capture (⌘K)** — de qualquer tela, grava um `candidate`. Captura é
  automática e barata de propósito. Se a gravação falhar, o texto **continua
  na tela**.
- **`/p/[slug]/work` · `/memory` · `/explore` · `/settings`** — empty
  states honestos, sem mock. MEMORY avisa na tela que o que está ali é
  captura, **não** conhecimento canônico.
- **`/auth/callback`** — parada, sem uso. Fica de pé para um futuro fluxo de
  recuperação de senha.
- **`/api/cron/keepalive`** — cron semanal da Vercel (`vercel.json`),
  autenticado por `CRON_SECRET`. Só toca o banco para evitar a pausa por
  inatividade do plano free do Supabase.

## Falha é parte da interface

Convenção do projeto, registrada em
`../docs/adr/0007-falha-visivel-em-server-action.md`:

- Toda Server Action de formulário devolve `ActionResult` e a mensagem
  aparece na tela (`src/components/action-form.tsx`).
- Erro de leitura vira aviso explícito, nunca "nada ainda"
  (`src/components/data-error.tsx`).
- Escrita que falha não apaga o que a pessoa digitou.

## O que está deliberadamente incompleto (é escopo, não bug)

- **Promoção para conhecimento canônico** (candidate → Markdown versionado
  no GitHub) é a **Fase 03**. O código que fazia isso no modelo
  single-tenant está parado em `src/_fase03/`, fora do App Router e fora do
  `tsconfig.json` — volta adaptado ao schema novo quando o repositório de
  conhecimento existir.
- **Extração de texto de arquivos** não está implementada. Upload guarda o
  arquivo no Storage (nada é descartado), mas o texto precisa ser colado.
- **`axes` é tabela vazia por design** — os eixos reais da Feel dependem da
  sessão de convergência dos três sócios, não de código.
- **Recuperação de senha** não existe. Ver ADR-0006.

## Rodar localmente

```bash
cp .env.local.example .env.local   # preencher com os valores do projeto Supabase
npm install
npm run dev                        # http://localhost:3000
```

Login local usa as mesmas credenciais do Supabase de produção — não há
instância de desenvolvimento separada. Cuidado com o que se escreve: os
`events` que a Fase 02 vai medir são os mesmos.

## Verificação

```bash
npm test              # Vitest — regras puras (state-rules, slug, bootstrap)
npx tsc --noEmit
npm run lint
npm run build
```

E2E (Playwright) existe em `e2e/`, e **não roda sem variáveis de ambiente**,
de propósito — escreve dado de verdade e contaminaria os `events` reais:

```bash
E2E_BASE_URL=http://localhost:3000 E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
```

A verificação do banco é separada e mais importante —
`../supabase/tests/verify.sh` sobe um Postgres descartável, aplica todas as
migrations e roda a suíte de RLS com três personas, cobrindo **allow e deny**.
Nenhuma migration deve tocar o banco real antes de passar ali.
