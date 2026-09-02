# Setup da infraestrutura dedicada — Cérebro da Feel

> Decisão tomada em 2026-08-27: infraestrutura em org/team novo e dedicado
> "Feel", separado das contas pessoais do Gabriel, nas três plataformas
> (GitHub, Vercel, Supabase).
>
> **Atualizado em 2026-08-28.** Gabriel revisou a parte de custo: o projeto
> é um **protótipo interno por enquanto** — "ainda não vou colocar o
> projeto na rua como produto" — e autorizou explicitamente, por conta e
> risco dele, rodar a estrutura mais barata possível enquanto isso for
> verdade. Isso muda só a peça que tinha custo real: **Vercel** passa a ser
> a conta pessoal gratuita do Gabriel, não um team novo em Pro (~US$60/mês
> pros 3, ou ~US$20/mês com 1 Member + 2 Viewers). GitHub e Supabase
> continuam em organização nova e dedicada — nenhum dos dois tem custo
> nesse volume, então não havia motivo pra abrir mão da separação limpa aí.
> Gatilho pra revisitar o Vercel: no dia em que isso deixar de ser
> protótipo interno e virar parte da operação comercial da Feel (ver
> `CEREBRO-DA-FEEL.md` §3).
>
> Este documento é o runbook de criação — execute na ordem, cada passo diz
> quem faz (você, manual) ou eu (via ferramenta), e por quê.

Nenhum recurso real foi criado ainda. Os passos manuais abaixo (1 e 3) não
têm ferramenta neste ambiente que os automatize — nenhuma das integrações
conectadas cria organização/repo do zero, só opera dentro de uma que já
existe. O passo 2 (Vercel) não precisa mais de nada manual, porque a conta
pessoal já está conectada a esta sessão. A partir do passo 4, eu assumo.

---

## 1. GitHub — organização e repositório (manual, você)

1. Crie uma organização GitHub nova. Sugestão de nome: `feel-cerebro-org`
   ou simplesmente o nome que a Feel já usa publicamente + sufixo, para não
   colidir com o repo pessoal "Ecossistema Feel" que já existe. **Não
   decidido — escolha o nome e me diga**, eu uso ele em todo o resto.
2. Dentro da org, crie um repositório **privado** chamado `feel-cerebro`
   (nome sugerido em `MODELO-DE-DADOS.md` §5.1 — sem acento, sem espaço).
3. Convide Gabrielle e Axel como membros da organização, com permissão de
   escrita no repositório.
4. Me avise o nome da org e a URL do repo — é o que eu preciso pra ligar o
   Vercel a ele e fazer o primeiro push (seção 4 abaixo).

### Estado em 2026-09-02 (tarde) — repositório criado, mas PÚBLICO

Gabriel criou https://github.com/quentalgabriel-cloud/feel-cerebro. Duas
coisas apareceram na verificação:

**1. O repositório está PÚBLICO — e o plano pedia privado.** Confirmado por
dois caminhos independentes: `git clone` anônimo funcionou (o proxy avisa
explicitamente que *não* injeta credencial para este repositório, e mesmo
assim o clone passou), e a página do repositório mostra o selo `Public`.

Isso importa porque o que está pra subir não é código genérico: é o porquê
estratégico da Feel, as decisões dos três sócios, o plano de fases inteiro e
o registro de risco. **Nada disso vazou ainda** — o único commit no remoto é
o `Initial commit` do Gabriel com um README de 14 bytes. Trocar para privado
*antes* do push evita o problema; trocar depois significa que o conteúdo
ficou público por algum tempo, sujeito a fork e indexação, e não há como
desfazer isso retroativamente.

Trocar seria em Settings → General → Danger Zone → *Change repository
visibility* → Private.

> **DECISÃO (2026-09-02, Gabriel): fica público.** Levantei o risco com o
> detalhe acima e ele autorizou explicitamente seguir assim — *"Autorizo e
> quero seguir assim público mesmo"*. Decisão dele, registrada aqui porque
> muda uma premissa que valia desde 2026-08-27 (`MODELO-DE-DADOS.md` §5.1 e
> o passo 1 deste documento pediam repositório **privado**).
>
> **O que isso passa a implicar, daqui pra frente:**
>
> - Todo commit é público no instante do push. Não existe "corrigir depois":
>   conteúdo em repositório público pode ter sido clonado, forkado ou
>   indexado antes de qualquer remoção, e reescrever história não apaga o
>   que já foi copiado.
> - **Segredo que vazar está vazado.** Chave do Supabase, `CRON_SECRET`,
>   token do GitHub — se algum entrar num commit, a resposta certa é
>   *rotacionar a credencial*, não apagar o commit. O `.gitignore` cobre
>   `.env.local`, e a varredura de segredo antes de cada push deixa de ser
>   zelo e passa a ser obrigatória.
> - A Fase 03 promove conhecimento canônico pra Markdown versionado **neste
>   repositório**. Enquanto ele for público, tudo que for promovido é
>   público — incluindo decisões e contexto interno dos três sócios. Isso
>   precisa ser reavaliado antes da Fase 03 ir ao ar, ou a promoção precisa
>   apontar pra outro repositório.
> - Gatilho pra revisitar: o mesmo do Vercel — quando isso deixar de ser
>   protótipo interno (`CEREBRO-DA-FEEL.md` §3).

**2. O remoto não estava vazio.** O `Initial commit` criou um `README.md` que
colidia com o nosso. Já resolvido localmente: os 7 commits foram rebaseados
em cima do commit do Gabriel, o conflito do README foi resolvido em favor do
nosso (que é o completo), e a árvore final ficou **idêntica** à de antes do
rebase (conferido com `git diff --stat`). O push agora é *fast-forward* puro
— `git rev-list --left-right --count` dá `0 7`. **Não vai precisar de
`--force`**, e se alguém precisar de force em algum momento, é sinal de que
algo mudou no remoto e a resposta certa é parar e olhar, não forçar.

### Estado em 2026-09-02 — repositório local pronto, push bloqueado

O repositório local está **completo e commitado**, na branch `main`, árvore
limpa, seis commits organizados por camada (scaffold · docs · banco · app ·
código parado da Fase 03 · READMEs). Verificado antes de commitar:
`tsc --noEmit`, `eslint` e `next build` limpos, e `supabase/tests/verify.sh`
com `RLS TEST: PASS` num Postgres descartável. Varredura de segredo nos 81
arquivos: nada — o único match era hash `sha512` de integridade no
`package-lock.json`.

**O que impede o push, exatamente:** o acesso ao GitHub desta sessão é
limitado a um conjunto de repositórios autorizados, e `feel-cerebro` não
está nele. Toda chamada de API fora desse conjunto responde 403 antes de
checar se o repositório existe — então eu **não consigo nem distinguir se
ele já existe ou não**. O push falha com a mensagem do proxy:

> *"access denied by the git proxy: quentalgabriel-cloud/feel-cerebro is not
> in this session's authorized repository set, so the proxy will not inject
> a credential for it. To fix, add the repository to the session's sources."*

Não é permissão do seu token nem coisa que eu contorne com `curl`: criar
repositório (`POST /user/repos`) e listar orgs também estão bloqueados por
serem paths fora do escopo de repositório. Também não existe conector de
GitHub no registro de conectores — procurei.

**Destravar tem dois passos, os dois seus:**

1. **Se o repositório ainda não existe** — crie no GitHub um repositório
   **privado** chamado `feel-cerebro` (na org nova, ou na sua conta
   `quentalgabriel-cloud` se preferir decidir a org depois; mover repo
   entre owners depois é trivial e não perde histórico). Não inicialize com
   README, `.gitignore` nem licença — o repositório local já tem tudo, e um
   commit inicial do lado do GitHub só cria conflito de histórico.
2. **Autorize o repositório para a sessão** — adicione `feel-cerebro` às
   fontes/repositórios desta conversa no app do Claude. Sem isso o proxy
   continua recusando, mesmo com o repositório existindo e você sendo dono.

Feito isso, o push é um comando só — o prompt pronto está em
[`PROMPT-GITHUB.md`](PROMPT-GITHUB.md).

## 2. Vercel — conta pessoal (feito, em 2026-08-28)

**Executado.** O app já está no ar, em deploy de produção, direto na sua
conta pessoal Vercel ("gquental", plano Hobby, `team_2sjFcoePiJ8zbmnwDwxRD3mu`)
— sem team novo, sem Pro, sem convite. É um deploy por arquivo
(`mcp__Vercel__deploy_to_vercel`), não ligado a nenhum repositório ainda,
porque o repo GitHub (passo 1) ainda não existe — quando existir, eu
substituo por `create_git_project` pra que todo push vire deploy automático.

- **URL de produção:** https://feel-cerebro.vercel.app
- **Projeto:** `feel-cerebro` (`prj_hGJNBOrBMLIABHAbi0uo1CA1Gstx`)
- **Build:** limpo, sem erro (Next.js 16 + Turbopack detectados automaticamente).
- **Estado funcional agora:** as páginas carregam, mas login/captura/inbox/
  promoção ainda vão falhar em runtime — zero variável de ambiente
  configurada, porque o banco Supabase ainda não existe (ver passo 3). Isso
  é esperado, não é um bug.
- Só você tem acesso ao painel Vercel — Gabrielle e Axel não precisam de
  conta lá, usam o app pela URL pública.
- Gatilho pra revisitar essa conta pessoal: quando o projeto deixar de ser
  protótipo interno — ver `CEREBRO-DA-FEEL.md` §3.

### Redeploy de 2026-09-01 — dois bugs de runtime corrigidos

Reaplicado depois da Fase 01 (multi-tenant) ir ao ar, pra levar duas
correções que só existiam localmente:

1. **Cron `keepalive` consultava tabela extinta** (`itens_inbox`, do modelo
   single-tenant antigo) — corrigido para `candidates`.
2. **Bug novo, achado só na verificação deste redeploy**: o matcher do
   `proxy.ts` não excluía `/api/*`, então toda chamada ao cron (que não tem
   cookie de sessão — o Vercel Cron nunca está "logado") era redirecionada
   pra `/login` antes de chegar no route handler, e o guard de
   `CRON_SECRET` nunca rodava. Corrigido excluindo `api` do matcher.

Confirmado por verificação pós-deploy: `/api/cron/keepalive` agora responde
`401` sem Bearer token (sinal correto de que o guard está ativo), `/login`
carrega, `/auth/callback` continua existindo como rota.

## 3. Supabase — ✅ RESOLVIDO em 2026-09-01

O banco existe e está configurado. Gabriel autorizou pausar `marim-figital`
para liberar a vaga (reversível — dados intactos, religa pelo painel a
qualquer momento).

| | |
|---|---|
| **Projeto** | `feel-cerebro` (`rvctaywzzipimrpjfkqi`) |
| **Organização** | `massa-hub` — a escolha da org deixou de ser bloqueio quando ficou claro que o limite é por pessoa; projeto pode ser transferido depois sem custo |
| **Região** | `sa-east-1` (São Paulo) |
| **Postgres** | 17.6 |
| **URL** | `https://rvctaywzzipimrpjfkqi.supabase.co` |
| **Migrations aplicadas** | `0001_foundation`, `0002_storage`, `0003_harden_functions`, `0004_private_schema` |
| **Estado** | 10 tabelas, RLS ativa em todas, 20 policies, **zero avisos do security advisor** |

Três correções de segurança saíram do próprio advisor durante a aplicação, e
as duas primeiras tentativas de correção estavam erradas — ambas pegas por
teste local antes de virarem problema em produção. O histórico completo está
no cabeçalho de `0004_private_schema.sql`. Resumo: os helpers de autorização
`SECURITY DEFINER` estavam expostos como endpoints RPC públicos; revogar
`EXECUTE` dos roles não bastava (o grant estava em `PUBLIC`), e revogar de
`PUBLIC` quebrava as próprias policies. A solução foi mover as funções para
um schema `private`, que o PostgREST não expõe.

### Bug pós-deploy: Magic Link redireciona para localhost — ação sua no painel

Reportado por Gabriel em 2026-09-01: ao confirmar o e-mail do magic link, o
navegador cai em `localhost`, não em `https://feel-cerebro.vercel.app`.

**Causa confirmada** (não é bug de código): o Supabase Auth só aceita como
destino de redirecionamento uma URL que esteja na allow-list configurada no
painel — `emailRedirectTo` no código (`login/page.tsx`, já correto, aponta
para `${window.location.origin}/auth/callback`) é ignorado se não bater com
essa lista, e o Supabase cai de volta pro **Site URL** padrão, que é
`http://localhost:3000`. Confirmado na documentação oficial:

> "Configure the Site URL and any additional redirect URLs. These are the
> only URLs that are allowed as redirect destinations after the user clicks
> a Magic Link."
> — [Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless)

Não existe ferramenta MCP para ler ou alterar essa configuração — ela vive
no painel do Supabase, não no Postgres nem na Management API exposta aqui.
**Isso precisa ser feito por você:**

1. Abra [URL Configuration](https://supabase.com/dashboard/project/rvctaywzzipimrpjfkqi/auth/url-configuration).
2. **Site URL**: troque para `https://feel-cerebro.vercel.app`.
3. **Redirect URLs**: adicione `https://feel-cerebro.vercel.app/auth/callback`
   (e, se quiser continuar testando localmente, mantenha também
   `http://localhost:3000/auth/callback` como uma segunda entrada — a lista
   aceita várias).
4. Salve.
5. Peça um magic link **novo** (o antigo, mesmo se ainda não usado, foi
   gerado com o Site URL antigo) e confirme que o clique cai em produção.

### Histórico: por que criar organização nova não resolvia

**Testei reaproveitar "massa-hub" antes de te pedir isso** (mesma lógica
"gratuito e mais simples" que usei pro Vercel) — inspecionei a org, o custo
de criar projeto lá deu confirmado em US$0/mês, e a chamada de criação
falhou com um limite real da Supabase, não uma minha cautela:

> *"The following organization members have reached their maximum limits
> for the number of active free projects within organizations where they
> are an administrator or owner: quentalgabriel-cloud (2 project limit)."*

### CORREÇÃO (2026-09-01) — criar organização nova NÃO resolve

Eu li o erro rápido demais e te dei um conselho errado. Fui checar a
documentação oficial da Supabase, e o limite **não é por organização, é por
pessoa**:

> "You are granted two free projects. **The project limit applies across all
> organizations where you are an Owner or Administrator.** This means you
> could have two Free Plan organizations with one project each, or one Free
> Plan organization with two projects. **Paused projects do not count**
> towards your free project limit."
> — [Billing on Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase)

Ou seja: você tem 2 projetos free ativos (`marim-figital` e `radar-da-rede`)
e está no teto **como usuário**. Abrir uma organização nova não te dá um
terceiro slot. As opções reais são três, e todas são suas:

| Opção | Custo | Consequência |
|---|---|---|
| **Pausar um dos dois ativos** | zero | Projeto pausado fica inacessível até você religar; os dados ficam intactos. Projeto pausado não conta no limite. Você já tem 4 pausados (`levay-os`, `bica-bar-system`, `massa-hub-3.0`, `sollu-system`), então o padrão já é esse. |
| **Upgrade de uma org para Pro** | US$25/mês + ~US$10/mês por projeto extra | Remove a pausa por inatividade de todos os projetos da org e libera o limite. |
| **Adiar** | zero | A Fase 01 inteira fica parada — é o único item do caminho crítico. |

Como o limite é por pessoa e não por organização, **a escolha da organização
deixou de ser um bloqueio** e virou só preferência: assim que um slot
existir, dá pra criar o projeto em "massa-hub" mesmo, ou numa org nova, sem
diferença prática para o desbloqueio.

1. Libere um slot por uma das opções acima (ou me diga qual, que eu executo
   a pausa).
2. Fique no plano **Free**: o volume declarado (dezenas de itens) cabe
   tranquilamente nos limites (500MB DB, 1GB storage, 5GB bandwidth). A
   limitação real do Free é a **pausa automática após ~1 semana sem
   atividade** — mitigada pelo cron semanal (`app/src/app/api/cron/keepalive`,
   já escrito) depois que as env vars existirem. Até lá, é normal o projeto
   pausar entre sessões — reative pelo dashboard quando for usar.
3. Convide Gabrielle e Axel como membros da organização.
4. Me avise o nome/slug da organização — eu crio o projeto dentro dela
   (`confirm_cost` + `create_project`, já testados e funcionando) e aplico
   as duas migrations na sequência.

## 4. O que eu faço depois que 1 e 3 existirem

- **Push inicial**: o working tree deste ambiente já está com `git add -A`
  feito (docs + app + migrations). Assim que o repo do passo 1 existir e eu
  tiver um token de escrita (seção 5), eu configuro o remote e empurro o
  primeiro commit.
- **Vercel ↔ GitHub**: `mcp__Vercel__create_git_project`, ligando o
  repositório `feel-cerebro` já populado à sua conta pessoal. **Ressalva
  descoberta ao executar**: o projeto Vercel `feel-cerebro` já existe (via
  deploy por arquivo, seção 2) mas *sem* vínculo de Git — e a própria
  ferramenta avisa que não reconecta um projeto existente do mesmo nome
  que ainda não tenha Git ligado. Pode nascer um segundo projeto
  (`feel-cerebro-2` ou parecido) em vez de religar o primeiro; se isso
  acontecer, o caminho mais simples é ligar o Git ao projeto original pelo
  próprio painel Vercel (Project → Settings → Git) em vez de forçar pela
  ferramenta — decido isso na hora, com o resultado real na mão.
- **Supabase**: `mcp__Supabase__create_project` dentro da organização nova,
  seguido de `mcp__Supabase__apply_migration` com `0001_init.sql` e depois
  `0002_storage.sql` (as 6 tabelas + RLS, mais o bucket de Storage — os
  dois já escritos e prontos).
- **Variáveis de ambiente** na Vercel: URL e chave publicável do Supabase
  (via `mcp__Supabase__get_project_url` / `get_publishable_keys`), a
  service role key (Supabase não expõe isso por nenhuma ferramenta desta
  sessão — precisa ser copiada do painel, Settings → API), um valor
  qualquer pro `CRON_SECRET`, e o token de escrita no GitHub (seção 5).
  Nenhuma ferramenta desta sessão escreve env var na Vercel diretamente —
  eu devolvo os pares exatos pra colar no painel (Project `feel-cerebro` →
  Settings → Environment Variables), e depois disparo um redeploy.

## 5. Pendência que não depende da ordem acima: credencial de escrita no GitHub

A promoção (`itens_inbox` → arquivo Markdown commitado) precisa de uma
Function na Vercel autenticada para escrever no repo — e o mesmo token
serve pro primeiro push (seção 4), já que empurrar o código também exige
escrita autenticada no repo. Duas opções, ambas manuais e ambas dependem
do repo do passo 1 já existir:

- **Token de acesso pessoal com escopo restrito** ao repositório
  `feel-cerebro` (mais simples de criar, mas fica atrelado à conta pessoal
  de quem gerar).
- **GitHub App** dedicado da organização (mais correto a médio prazo —
  não depende de uma pessoa específica — mas dá mais trabalho para
  configurar agora).

Este documento não decide qual — é a pergunta em aberto #2 de
`MODELO-DE-DADOS.md` (commit direto vs. PR) que também afeta essa escolha:
um GitHub App pode ter permissão só de abrir PR, um token pessoal
normalmente tem permissão de commit direto.

---

## O que já está pronto, independente desta decisão

- `MODELO-DE-DADOS.md` — especificação completa das tabelas.
- `CEREBRO-DA-FEEL.md` — documento fundador do projeto.
- `supabase/migrations/0001_init.sql` — migration executável das 6 tabelas
  + RLS.
- `app/` — o app Next.js da Fase 1 inteiro: login por magic link, captura
  (colar/upload), lista de inbox, promoção com geração de id e commit no
  GitHub. `npx tsc --noEmit`, `npx eslint .` e `npx next build` limpos. Ver
  `app/README.md` pro que está e o que ainda não está ligado (extração de
  arquivo).
- Um repositório git local na raiz deste diretório, com tudo (`.gitignore`
  incluso) já em `git add -A`, pronto pro primeiro commit assim que o
  remote do GitHub existir.
- **O app está no ar**: https://feel-cerebro.vercel.app (Vercel, conta
  pessoal, seção 2) — sem banco ainda, então login/captura/promoção
  respondem com erro até as env vars existirem.
- **`supabase/migrations/0002_storage.sql`** — escrita e testada (build
  limpo) desde a última rodada; cobre o bucket que faltava.

O que falta, e só você resolve: nome da org GitHub + repo (passo 1), nome
da org Supabase nova (passo 3 — testei "massa-hub" primeiro, bateu no
limite de 2 projetos free por organização, detalhe na seção 3), e um token
do GitHub com escrita no repo (seção 5). Assim que eu tiver isso, sigo
sozinho até o app estar no ar de verdade (com banco, com promoção
funcionando) e testado ponta a ponta com pelo menos um login real.
