# Estado real — 2026-09-02

Fatos verificáveis, não intenções. Cada linha aqui foi confirmada com
ferramenta na sessão que escreveu este arquivo. Onde algo é suposição, está
dito.

## Infraestrutura

| Peça | Estado | Identificadores |
|---|---|---|
| **Supabase** | ✅ ativo | Projeto `feel-cerebro` (`rvctaywzzipimrpjfkqi`), org `massa-hub`, região `sa-east-1`, Postgres 17.6, `https://rvctaywzzipimrpjfkqi.supabase.co` |
| **Vercel** | ✅ em produção | Projeto `feel-cerebro` (`prj_hGJNBOrBMLIABHAbi0uo1CA1Gstx`), conta pessoal `gquental` / `team_2sjFcoePiJ8zbmnwDwxRD3mu`, plano Hobby. https://feel-cerebro.vercel.app |
| **GitHub** | ✅ push concluído, **público** — 11 commits em `main` | https://github.com/quentalgabriel-cloud/feel-cerebro |

**Vercel é deploy por arquivo, não por Git.** O projeto não está ligado a
repositório nenhum — cada deploy foi feito enviando a árvore de arquivos.
Trocar por deploy contínuo é um item aberto (ver abaixo).

**Duas autorizações explícitas do Gabriel governam a infra**, e continuam
valendo até ele dizer o contrário:

1. **Conta pessoal gratuita na Vercel**, não team Pro — porque *"ainda não
   vou colocar o projeto na rua como produto"*. Gatilho de revisão: o dia em
   que deixar de ser protótipo interno.
2. **Repositório público** (2026-09-02) — levantei o risco de a estratégia
   interna dos três sócios ficar exposta e ele autorizou seguir assim
   mesmo. Consequências registradas em `SETUP-INFRAESTRUTURA.md` §1; a mais
   importante é que **segredo commitado é segredo vazado** — a resposta
   passa a ser rotacionar a credencial, não apagar o commit.

## Banco

10 tabelas, RLS ativa em todas, ~20 policies, **zero avisos do security
advisor**. Migrations aplicadas em produção:

```
0001_foundation      profiles · organizations · organization_members ·
                     projects · project_state · state_items · events ·
                     raw_files · candidates · axes
0002_storage         bucket raw-files
0003_harden_functions  (correção parcial — ver 02-APRENDIZADOS §2)
0004_private_schema    (a correção certa)
0005_org_bootstrap     primeira organização sem service role
```

As regras de orientação são impostas **pelo banco**: índice único parcial
garante NOW=1, check constraint garante NEXT≤3. A aplicação valida antes só
para dar mensagem decente ao usuário.

## App

Fase 01 completa e no ar: login por magic link, tenancy, NOW/NEXT/NOT NOW,
Quick Capture (⌘K), "o que mudou" a partir de `events`, e empty states
honestos em WORK/MEMORY/EXPLORE.

Verificação na última execução: `tsc --noEmit` ✅ · `eslint` ✅ ·
`next build` ✅ (11 rotas, nenhuma vazando de `_fase03/`) ·
`supabase/tests/verify.sh` → `RLS TEST: PASS` ✅ · varredura de segredo na
árvore e no histórico ✅ limpa.

## Bloqueado em ação humana

**Confira o estado atual de cada um antes de assumir que continua
pendente** — todos dependem do Gabriel e podem já ter sido resolvidos.

1. **Magic link redireciona para `localhost` — status incerto.** O código
   está certo (`emailRedirectTo` aponta para a origem correta). O Supabase
   Auth só aceita destinos que estejam na allow-list do painel, e ignora o
   resto caindo no Site URL padrão. Correção: [URL Configuration](https://supabase.com/dashboard/project/rvctaywzzipimrpjfkqi/auth/url-configuration)
   → Site URL = `https://feel-cerebro.vercel.app`, e adicionar
   `https://feel-cerebro.vercel.app/auth/callback` em Redirect URLs. **Não
   existe ferramenta MCP que leia ou altere isso.** Consultei `auth.users`
   em 2026-09-02: existe **um** usuário (`quentalgabriel1@gmail.com`),
   criado e confirmado em 2026-09-01 05:59 UTC, com login em 2026-09-01
   09:16 UTC — os três horários próximos entre si sugerem teste em
   ambiente local (onde `localhost` é o destino certo, não o bug), não uma
   confirmação de que o fix em produção já foi aplicado. **Não dá para
   concluir que o bug foi corrigido só com este dado — perguntar ao
   Gabriel ou pedir um novo login a partir da URL de produção.**
2. ~~Push para o GitHub~~ — **resolvido em 2026-09-02.** 11 commits em
   `main`, publicados pela máquina do Gabriel via GitHub Desktop
   (o proxy de git da sessão continua recusando escrita direta; isso não
   mudou e vale para qualquer sessão futura — o caminho que funciona é
   sempre a máquina do usuário).
3. **Dogfood real — confirmado ausente.** Consulta direta em 2026-09-02:
   `projects` tem **zero linhas** e `events` tem **zero linhas**. Ninguém
   criou o projeto "Feel" de verdade, com objetivo e NOW/NEXT/NOT NOW
   reais. A Fase 02 depende disso: sem uso real não há `events` reais, e
   sem `events` reais o Resume da 02 não tem o que agregar. **Este é hoje
   o maior bloqueio do projeto** — não é uma tarefa de engenharia, é o
   Gabriel (ou Gabrielle/Axel) precisando usar o produto de verdade.

## Aberto, não bloqueado

- **Fase 01 sem gate formal fechado** — faltam testes unitários
  (`NEXT<=3`, validação de state), E2E (autenticar → criar projeto → setar
  NOW/NEXT → Quick Capture → recarregar → persistiu) e os ADRs mínimos
  (`docs/ARCHITECTURE.md`, `SCOPE.md`, `SECURITY.md`, `docs/adr/`).
- **Deploy contínuo** — trocar deploy por arquivo por `create_git_project`
  quando os commits estiverem no GitHub. ⚠️ Essa ferramenta pode criar um
  projeto Vercel **novo** em vez de reconectar o existente, o que levaria a
  URL de produção junto. Confirmar o comportamento antes de rodar; ligar
  pelo painel é um clique e não arrisca nada.
- **Código da Fase 03 parado** em `app/src/_fase03/` — fluxo de promoção
  com Octokit que funcionava no modelo single-tenant. Fora do App Router e
  fora do `tsconfig`, portanto não vira rota e não entra no build. Volta
  adaptado ao vocabulário novo (D-02) e à identidade dupla (D-08).
- **Repositório de conhecimento não existe** (D-04: separado do repo de
  código). Pré-condição dura da Fase 03.
