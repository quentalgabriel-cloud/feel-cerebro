# Cérebro da Feel — app (Fase 1)

Next.js 16 + TypeScript + Tailwind v4 + Supabase (`@supabase/ssr`) +
Octokit. Implementa só a **Fase 1** de `../CEREBRO-DA-FEEL.md` §7 —
captura e memória. A tela de mapa/grafo é Fase 2, deliberadamente não
começada: depende da sessão de convergência dos três fundadores definindo
os eixos reais da Feel (ver `../MODELO-DE-DADOS.md` §5, pergunta 6, e
`eixos` como tabela vazia por design).

## O que existe

- **`/login`** — magic link via Supabase Auth. Sem senha no sistema.
- **`/inbox`** — lista compartilhada de tudo que os três capturaram, com
  status (`novo` → `em_extracao` → `pronto_para_revisao` → `promovido` /
  `descartado`).
- **`/inbox/novo`** — captura: colar texto (grava direto) ou enviar
  arquivo (PDF/DOCX/Markdown/TXT — sobe direto pro Supabase Storage via
  signed URL, sem passar pela function).
- **`/inbox/[id]`** — abre um item, mostra o texto (quando existe) e o
  formulário de promoção (tipo, título, escopo, eixo opcional,
  epistêmico/confiança opcionais).
- **`/api/promote`** — gera o id humano-legível (`DEC-001`, `INS-001`...),
  monta o Markdown com frontmatter, commita no GitHub via Octokit, grava
  `notas_promovidas`, atualiza `itens_inbox`.
- **`/api/cron/keepalive`** — chamado semanalmente pelo Vercel Cron
  (`vercel.json`), autenticado por `CRON_SECRET`. Só toca o banco pra
  evitar a pausa por inatividade do plano free do Supabase
  (`MODELO-DE-DADOS.md` §3.6) — não faz nada além disso ainda.

## O que está deliberadamente incompleto (não é bug, é escopo)

- **Extração de texto de arquivos não está implementada**
  (`src/app/api/extrair/route.ts` é um stub honesto). MarkItDown foi a
  ferramenta adotada (ver `PROMPT-BUSCA-OSS`/`CEREBRO-DA-FEEL.md` §6), mas
  é Python — integrá-la a uma Function Node é uma decisão de
  infraestrutura ainda não tomada (runtime Python separado, ou serviço
  HTTP próprio). Até lá, upload funciona (arquivo fica seguro no Storage,
  nunca descartado — princípio 5), mas o texto precisa ser colado
  manualmente na revisão.
- **RLS granular por `escopo: cliente:<nome>`** não existe — a migration
  (`../supabase/migrations/0001_init.sql`) só cobre `feel` e `pessoal`,
  porque não há hoje nenhum registro de escopo cliente.
- **Curador (relações propostas por similaridade)** não existe — o cron
  semanal (`/api/cron/keepalive`) hoje só faz o keepalive, a metade do
  curador é Fase posterior, sem volume que justifique ainda.

## Rodar localmente

Nenhum recurso real (Supabase, GitHub) existe ainda — ver
`../SETUP-INFRAESTRUTURA.md` para o runbook de criação da infra dedicada.
Depois que existir:

```bash
cp .env.local.example .env.local   # preencher as variáveis
npm install
npm run dev                        # http://localhost:3000
```

Sem as env vars preenchidas, a home redireciona para `/login`, mas as
chamadas ao Supabase falham — comportamento esperado até a infra existir.

## Verificação

```bash
npx tsc --noEmit
npx eslint .
npx next build
```
