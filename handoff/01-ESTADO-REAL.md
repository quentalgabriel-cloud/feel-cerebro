# Estado real — 2026-09-02

Fatos verificáveis, não intenções. Cada linha aqui foi confirmada com
ferramenta na sessão que escreveu este arquivo. Onde algo é suposição, está
dito.

## Infraestrutura

| Peça | Estado | Identificadores |
|---|---|---|
| **Supabase** | ✅ ativo | Projeto `feel-cerebro` (`rvctaywzzipimrpjfkqi`), org `massa-hub`, região `sa-east-1`, Postgres 17.6, `https://rvctaywzzipimrpjfkqi.supabase.co` |
| **Vercel** | ✅ deploy contínuo por Git, funcionando | Projeto `feel-cerebro` (`prj_hGJNBOrBMLIABHAbi0uo1CA1Gstx`), conta pessoal `gquental` / `team_2sjFcoePiJ8zbmnwDwxRD3mu`, plano Hobby. https://feel-cerebro.vercel.app |
| **GitHub** | ✅ push concluído, **público** — 12 commits em `main` | https://github.com/quentalgabriel-cloud/feel-cerebro |

**Descoberta e correção em 2026-09-02 (tarde): o projeto Vercel já estava
ligado ao GitHub** — provavelmente Gabriel conectou pelo painel em algum
momento — mas os dois primeiros deploys automáticos disparados por pushes
desta sessão falharam com `ERROR`. Causa confirmada nos build logs: o
Root Directory do projeto não estava configurado como `app`, então o
build rodava a partir da raiz do repositório e o alias de import `@/*`
(que o `tsconfig.json` de dentro de `app/` mapeia para `./src/*`) não
resolvia. Isso nunca apareceu nos deploys por arquivo porque
`deploy_to_vercel` sempre enviou só o conteúdo de `app/` como se fosse a
raiz — o descompasso só existia no caminho por Git. **Gabriel corrigiu
pelo painel** (Settings → General → Root Directory → `app`) e o redeploy
seguinte (`dpl_Eimo6toFujpTkwGuvwje8V81HH3w`, commit `c86b2b8`) ficou
`READY`. Confirmado batendo direto na URL de produção: `/login` serve a
versão nova (email+senha) e `/api/cron/keepalive` sem credencial continua
`401`. Deploy por arquivo não é mais necessário — todo push em `main`
builda e publica sozinho.

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

1. ~~Magic link redireciona para `localhost`~~ — **resolvido em
   2026-09-02, mas trocando o mecanismo, não consertando o antigo.**
   Mesmo depois do ajuste na URL Configuration, Gabriel confirmou que o
   redirect continuava preso em `localhost`. Em vez de insistir na
   allow-list do Supabase (painel, sem ferramenta MCP), o login virou
   **email+senha** (`signInWithPassword`, ver `login/page.tsx`) — não
   depende de `emailRedirectTo` nem de nenhuma allow-list. Senha da conta
   existente definida via SQL direto (`crypt()`/pgcrypto, já disponível no
   projeto), sem novo env var. **Confirmado funcionando em produção**:
   login real às 2026-09-02 20:50 UTC (`auth.users.last_sign_in_at`),
   página servida por `feel-cerebro.vercel.app/login` já é a versão nova.
   Consequência: não há autocadastro público — contas continuam
   provisionadas manualmente (ver comentário no topo de `login/page.tsx`
   sobre por quê).
2. ~~Push para o GitHub~~ — **resolvido em 2026-09-02.** 12 commits em
   `main`, publicados pela máquina do Gabriel via GitHub Desktop
   (o proxy de git da sessão continua recusando escrita direta; isso não
   mudou e vale para qualquer sessão futura — o caminho que funciona é
   sempre a máquina do usuário).
3. ~~Deploy contínuo quebrado~~ — **resolvido em 2026-09-02.** O projeto
   Vercel já estava ligado ao Git (achado nesta sessão); faltava só o
   Root Directory = `app`, que Gabriel ajustou pelo painel. Deploy por
   arquivo (`deploy_to_vercel`) não é mais necessário — todo push em
   `main` builda e publica sozinho.
4. **Dogfood real — confirmado ausente.** Consulta direta em 2026-09-02:
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
- ~~Deploy contínuo~~ — **já existe** (ver acima); só falta o Root
  Directory = `app` no painel para os builds pararem de falhar. Depois
  disso, não use `mcp__Vercel__create_git_project` nesse projeto — a
  própria ferramenta avisa que não reconecta um projeto existente sem
  Git ligado, e este já tem. Reservar essa ferramenta só para um projeto
  Vercel que ainda não exista.
- **Código da Fase 03 parado** em `app/src/_fase03/` — fluxo de promoção
  com Octokit que funcionava no modelo single-tenant. Fora do App Router e
  fora do `tsconfig`, portanto não vira rota e não entra no build. Volta
  adaptado ao vocabulário novo (D-02) e à identidade dupla (D-08).
- **Repositório de conhecimento não existe** (D-04: separado do repo de
  código). Pré-condição dura da Fase 03.
