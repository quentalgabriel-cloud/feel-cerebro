# Cérebro da Feel — app (Fase 01)

Next.js 16 (App Router + Turbopack) + TypeScript + Tailwind v4 + Supabase
(`@supabase/ssr`). Implementa a **Fase 01 — Live Foundation** do
`../MASTER-IMPLEMENTATION-PLAN.md`: a camada de orientação, multi-tenant,
com autorização no banco.

No ar em https://feel-cerebro.vercel.app.

## O que existe

- **`/login`** — magic link via Supabase Auth. Não há senha no sistema.
- **`/projects`** — lista os projetos de que você é membro e cria projeto
  novo. O primeiro login cria seu perfil e sua organização pessoal
  sozinho, sob RLS, sem service role.
- **`/p/[slug]/now`** — a tela que justifica o sistema: **um** NOW, no
  máximo **três** NEXT, o resto em NOT NOW, mais "o que mudou" lido de
  `events`. Os limites são impostos pelo banco (índice único parcial e
  check constraint), não pela aplicação — a aplicação só valida antes pra
  dar mensagem decente.
- **Quick Capture (⌘K)** — de qualquer tela, grava um `candidate`.
  Captura é automática e barata de propósito.
- **`/p/[slug]/work` · `/memory` · `/explore` · `/settings`** — empty
  states honestos, sem mock. MEMORY avisa na tela que o que está ali é
  captura, **não** conhecimento canônico.
- **`/auth/callback`** — retorno do magic link, troca o code por sessão.
- **`/api/cron/keepalive`** — cron semanal da Vercel (`vercel.json`),
  autenticado por `CRON_SECRET`. Só toca o banco pra evitar a pausa por
  inatividade do plano free do Supabase.

## O que está deliberadamente incompleto (é escopo, não bug)

- **Promoção para conhecimento canônico** (candidate → Markdown versionado
  no GitHub) é a **Fase 03**. O código que fazia isso no modelo
  single-tenant está parado em `src/_fase03/`, fora do App Router e fora do
  `tsconfig.json` — volta adaptado ao schema novo quando o repositório
  existir.
- **Extração de texto de arquivos** não está implementada. Upload guarda o
  arquivo no Storage (nada é descartado), mas o texto precisa ser colado.
- **`axes` é tabela vazia por design** — os eixos reais da Feel dependem da
  sessão de convergência dos três sócios, não de código.

## Rodar localmente

```bash
cp .env.local.example .env.local   # preencher com os valores do projeto Supabase
npm install
npm run dev                        # http://localhost:3000
```

Para o magic link funcionar em `localhost`, `http://localhost:3000/auth/callback`
precisa estar na allow-list de **Redirect URLs** do Supabase Auth — ver
`../SETUP-INFRAESTRUTURA.md` §3.

## Verificação

```bash
npx tsc --noEmit
npm run lint
npm run build
```

A verificação do banco é separada e mais importante — `../supabase/tests/verify.sh`
sobe um Postgres descartável, aplica todas as migrations e roda a suíte de
RLS. Nenhuma migration deve tocar o banco real antes de passar ali.
