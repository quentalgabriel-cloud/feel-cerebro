# Aprendizados — o que já custou bug real

Cada item aqui saiu de uma falha concreta neste projeto. Estão escritos como
**regra generalizável**, não como diário: a maioria vale para qualquer
sistema com Postgres, RLS e Supabase, não só para este.

Os três primeiros são de segurança e foram pegos por teste local **antes**
de chegarem em produção. Os dois seguintes chegaram em produção e foram
pegos na verificação pós-deploy. Os últimos são erros de raciocínio meus.

---

## 1. Subquery dentro de policy de RLS é, ela mesma, filtrada por RLS

**O que aconteceu.** A policy que permite alguém criar a própria
organização no primeiro login precisava responder "esta organização está
vazia?". A primeira versão fazia o óbvio:

```sql
-- ERRADO
not exists (select 1 from organization_members where organization_id = ...)
```

Um usuário de fora consultava uma organização **populada** e a via como
vazia — porque a subquery roda sob a RLS dele, que esconde as linhas dos
outros. Resultado: ele se inseria como membro de organização alheia.

**A regra.** Dentro de uma policy, toda leitura de tabela protegida enxerga
apenas o que o usuário atual já enxerga. Se a decisão de autorização depende
de fatos que o usuário **não** pode ver, a checagem precisa rodar fora da
RLS — uma função `SECURITY DEFINER` que responde honestamente:

```sql
-- CERTO
create function private.org_has_members(org uuid) returns boolean
  language sql security definer set search_path = public as $$
    select exists (select 1 from organization_members where organization_id = org)
  $$;
```

**O sinal de alerta:** qualquer `exists` / `not exists` / `count` dentro de
uma policy. Pergunte sempre: *se o atacante não puder ver essas linhas, o
que esta expressão responde para ele?*

---

## 2. `SECURITY DEFINER` no schema `public` vira endpoint RPC público

**O que aconteceu.** Os helpers de autorização (`is_org_member`,
`can_write_project`...) nasceram em `public`, com `SECURITY DEFINER`. O
PostgREST expõe **tudo que está em `public`** como endpoint RPC — ou seja,
as próprias funções que decidem autorização estavam chamáveis de fora.

Duas tentativas de correção falharam, e cada uma ensinou algo:

- **Tentativa 1 — revogar `EXECUTE` de `anon` e `authenticated`.** Não teve
  efeito nenhum. O grant real estava em `PUBLIC`, não nos roles. Revogar de
  um role não desfaz um grant a `PUBLIC`. (Confira em `pg_proc.proacl`, não
  na intuição.)
- **Tentativa 2 — revogar de `PUBLIC` também.** Quebrou a RLS inteira:
  `permission denied for function is_org_member`. **Policies rodam com o
  privilégio do role que consulta** — se ele não tem `EXECUTE`, a policy não
  avalia e tudo para.

**A correção certa:** mover as funções para um schema que o PostgREST não
expõe.

```sql
create schema private;
grant usage on schema private to authenticated;
-- funções recriadas em private.*, EXECUTE só para authenticated
-- todas as policies reescritas para chamar private.*
```

**A regra.** Função que decide autorização não mora em schema exposto. E
"revoguei o acesso" não é verdade até `pg_proc.proacl` concordar.

---

## 2b. A lição escrita não impediu a repetição — e o que finalmente impediu

**O que aconteceu (2026-09-09, uma semana depois do item 2).** A migration
0009 criou `public.next_display_id` como `SECURITY DEFINER`, deliberadamente
exposta pelo PostgREST, e fechou o acesso assim:

```sql
revoke execute on function public.next_display_id(uuid, text) from public;
```

Eu li essa linha como "de fora ninguém executa" e segui. O `proacl` dizia
`{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,...}` — havia
uma concessão **nominal** a `anon`, que o Supabase adiciona com
`alter default privileges in schema public grant execute on functions to anon`
e que revoke ao pseudo-papel PUBLIC não toca. É o item 2 pelo avesso: lá o
grant estava em PUBLIC e eu revoguei do role; aqui estava no role e eu
revoguei do PUBLIC.

Quem viu foi o linter do Supabase, não eu — e a regra violada estava escrita
por mim, em `docs/SECURITY.md` §3, dois parágrafos acima de onde a repeti.

**A correção de fundo não foi revogar.** `knowledge_counters` já tinha RLS
com exatamente a mesma regra que o corpo da função checava à mão
(`can_write_project`). O `SECURITY DEFINER` estava **desligando essa policy**
para pôr uma linha de código no lugar dela. A 0011 passou a função a
`SECURITY INVOKER` e apagou `private.next_display_id` — mantê-la seria o
mesmo bypass um salto mais longe, onde o linter não olha.

> Duas autoridades concordando é redundância. Uma autoridade tendo desligado
> a outra é o furo.

**O que de fato impede a repetição** é a seção 9 do `rls_test`: três
invariantes que varrem `pg_proc` inteiro e derrubam a suíte se qualquer
função de `public` ficar executável por `anon`, se qualquer função de
`public` for `SECURITY DEFINER`, ou se qualquer função nossa ficar com
`search_path` solto. As três foram quebradas de propósito, uma a uma, para
provar que mordem.

**A regra.** Documentar uma armadilha não protege contra ela; só teste que
roda protege. Escrever a lição é o começo do trabalho, não o fim. Se você se
pegar escrevendo "agora eu lembro de sempre fazer X", pare e transforme X em
teste.

**Corolário — comando que não faz nada é pior que comando nenhum.** A
primeira versão da 0011 trazia, para fechar o problema na origem:

```sql
alter default privileges in schema public
  revoke execute on functions from public, anon;
```

Medido num Postgres descartável, nas duas ordens possíveis, com e sem grant
nominal antes: **não funciona**. O revoke ao PUBLIC não materializa nada em
`pg_default_acl`, o default embutido do PostgreSQL (EXECUTE ao PUBLIC em toda
função nova) volta a valer na criação, e `anon` herda por ser membro
implícito de PUBLIC. A função nasce sempre com `=X` no `proacl`. A linha foi
removida do arquivo, com o registro do porquê no lugar dela. Uma proteção que
só parece proteção é a matéria-prima do próximo bug desta lista.

**Corolário 2 — laboratório que não é igual à produção é a única coisa que um
verde não avisa.** A primeira invariante acusou 37 funções do `pgcrypto`
executáveis por `anon` em `public`. Nenhuma delas existia: o
`_supabase_stub.sql` instalava a extensão em `public`, e o Supabase instala
em `extensions`. O stub foi corrigido para começar como a produção começa.

---

## 3. Constraint `DEFERRABLE INITIALLY DEFERRED` não protege durante a transação

**O que aconteceu.** A regra "um único NOW por projeto" foi implementada
como unique constraint deferida. Ela só falha no `COMMIT` — então, dentro da
transação, um segundo NOW era aceito silenciosamente, e qualquer código que
lesse o estado no meio via dois.

**A correção:** índice único parcial, imediato.

```sql
create unique index idx_one_now_per_project
  on state_items (project_id) where kind = 'now';
```

**A regra.** Deferir uma constraint troca "impossível" por "impossível no
final". Só defira quando a violação temporária é intencional (reordenação em
massa, por exemplo). Invariante de domínio quer checagem imediata.

---

## 4. Middleware que não exclui `/api/*` mata autenticação de máquina

**O que aconteceu.** O `proxy.ts` (o `middleware.ts` do Next 16) redirecionava
para `/login` quem não tem sessão. O Vercel Cron nunca tem sessão — então a
chamada do cron era redirecionada antes de chegar no route handler, e o guard
de `CRON_SECRET` **nunca executava**. Em produção, silenciosamente.

**A regra.** Rotas que fazem a própria autenticação (bearer token, assinatura
de webhook, service role) precisam sair do matcher do middleware de sessão.
São dois sistemas de identidade diferentes; misturar faz o mais genérico
engolir o mais específico. Verificação que prova: chamar o endpoint sem
credencial e exigir **401**, não 307.

---

## 5. Server Action é alcançável por POST direto

Não virou bug aqui porque a arquitetura já assumia isso, mas é a premissa
que sustenta tudo acima.

**A regra.** Toda Server Action é um endpoint. Validação em componente é
UX, não segurança. Se a regra não está na RLS ou numa constraint, ela não
existe — vale para tenancy, para papéis e para as invariantes de domínio
(NOW=1, NEXT≤3).

---

## 5b. Early return pula o passo que foi criado depois

**O que aconteceu.** `ensureProfile()` criava o profile e, no mesmo request,
a organização pessoal. Quem já tinha profile saía na primeira linha:

```ts
if (existing) return existing as Profile;   // e a organização? nunca mais.
```

O profile do Gabriel era anterior à migration que introduziu o bootstrap de
organização. Ele tinha profile, nunca teve organização, e **todo login
seguinte batia nesse return e nunca tentava de novo**. Meses depois, criar
projeto simplesmente não funcionava — para ele, e só para ele.

**A regra.** Quando um passo novo é acrescentado a um fluxo de inicialização,
os registros que nasceram **antes** dele nunca vão executá-lo. Ou a
inicialização é idempotente e roda inteira toda vez — verificando cada
invariante em vez de assumir "se A existe, B também existe" — ou existe uma
migration que conserta o passado. As duas coisas são trabalho; escolher
nenhuma é escolher que uma parte dos usuários fique quebrada em silêncio.

**Sinal de alerta:** `if (x) return x` no começo de uma função de
`ensure*`/`getOrCreate*`. Pergunte: *o que mais essa função garantia, e quem
entrou por este atalho está garantido?*

---

## 5c. Server Action que retorna mudo é um formulário que mente

**O que aconteceu.** Consequência do item anterior, e foi a parte cara. A
ação tinha `if (!membership) return;`. O formulário submetia, a ação não
escrevia nada, e a tela não mudava. Gabriel tentou várias vezes antes de
reportar — não havia como distinguir "falhou" de "eu preenchi errado". Um bug
de dado (5b) ficou escondido horas atrás de um bug de interface.

**A regra.** Em Server Action, `return` sem valor é indistinguível de sucesso
para quem está olhando a tela. Toda ação alcançável por formulário devolve
resultado, e o formulário mostra. Corolário que vale igual: **erro de leitura
nunca pode virar empty state** — página que renderiza "nada ainda" quando a
query falhou mente com confiança, e isso é pior que tela branca, porque tela
branca ninguém confunde com dado.

O padrão adotado está em `docs/adr/0007-falha-visivel-em-server-action.md`.

---

## 5d. Lógica de decisão que precisa de banco só é testada em produção

**O que aconteceu.** O bug de 5b era testável em dez linhas — mas a decisão
morava dentro de uma função que só roda com Supabase e sessão HTTP, então
nunca teve teste. A correção veio junto com a extração: a decisão de "criar
organização ou não" virou `lib/org-bootstrap.ts`, que recebe uma porta
estreita (`OrgStore`) e não conhece Supabase nenhum. O teste implementa a
porta à mão e prova o caso real.

**A prova de que o teste vale:** reintroduzi o `if (existing) return` antigo
e a suíte ficou vermelha exatamente no teste certo; removi, voltou verde. Um
teste de regressão que nunca foi visto falhando é um teste que você espera
que funcione.

**A regra.** Se a decisão é interessante, ela sai de perto do I/O. O que fica
junto do banco é tradução de chamada, que erra pouco e erra visível.

---

## 6. Erros meus de raciocínio — os mais caros

### 6.1 Li a mensagem de erro rápido demais e dei conselho errado duas vezes

O Supabase recusou criar projeto com *"organization members have reached
their maximum limits ... within organizations where they are an
administrator or owner"*. Concluí "o limite é por organização" e recomendei
**criar uma organização nova** — duas vezes. A documentação oficial diz o
contrário, explicitamente:

> "The project limit applies across all organizations where you are an Owner
> or Administrator. ... Paused projects do not count towards your free
> project limit."

Organização nova não daria slot nenhum. A saída real era pausar um projeto
inativo.

**A regra.** Quando um erro de plataforma trava o trabalho, ler a
documentação **antes** de propor a solução custa um minuto; propor com base
em leitura apressada custa o tempo do outro e a confiança dele. Erro de
quota quase nunca significa o que a primeira leitura sugere.

### 6.2 Duas correções de segurança erradas antes da certa

Descritas no item 2. O que salvou foi não terem ido direto para produção:
cada uma passou primeiro pelo harness local. **A lição não é "eu errei" — é
que o harness pagou seu custo três vezes antes de qualquer usuário existir.**

### 6.3 Documentação que descrevia um sistema que já não existia

O `app/README.md` seguia descrevendo rotas `/inbox` e a tabela
`itens_inbox` como se estivessem no ar, muito depois da migração para
multi-tenant. Quem abrisse o repositório seria ativamente enganado.

**A regra.** Doc desatualizada é pior que doc ausente: a ausente faz você
ler o código, a errada faz você confiar. Neste projeto, corrigir a doc que
sua mudança invalidou faz parte da mesma entrega.

---

## 7. Fatos de plataforma que custaram tempo para descobrir

- **Supabase free: 2 projetos ativos *por pessoa*,** somando todas as
  organizações onde você é Owner ou Administrator — não por organização.
  Projeto pausado não conta.
- **Supabase Auth ignora `emailRedirectTo`** se a URL não estiver na
  allow-list do painel, e cai silenciosamente no Site URL (default
  `http://localhost:3000`). Nenhuma ferramenta MCP lê ou altera isso.
- **Next.js 16 renomeou `middleware.ts` para `proxy.ts`** (export `proxy`).
  A documentação real está em `node_modules/next/dist/docs/`, não na memória
  de quem escreve o código — esta versão tem breaking changes.
- **React Flow virou `@xyflow/react`.** O pacote `reactflow` é o antigo.
- **`create_git_project` da Vercel não reconecta** um projeto existente de
  mesmo nome que esteja desligado de repositório — pode criar um projeto
  novo e levar a URL de produção junto.
- **Regex com caracteres combinantes literais** se corrompe em trânsito
  entre ferramentas — o intervalo de diacríticos escrito com os caracteres
  crus vira lixo silenciosamente. Escreva sempre escapado:
  `.replace(/[\u0300-\u036f]/g, "")`.

---

## 8. O padrão de verificação que pegou tudo isso

Vale mais que qualquer item individual desta lista, e está descrito em
`03-METODO-E-GOVERNANCA.md`: um Postgres descartável de verdade, as
migrations aplicadas em ordem, e um teste de RLS com três personas que cobre
**allow e deny** numa transação com `ROLLBACK`.

Os itens 1, 2 e 3 foram pegos por ele, antes de existirem em produção.

O item 2b **não foi** — chegou em produção e ficou lá até o linter falar,
porque naquele momento o harness não varria o catálogo. É a diferença entre
ter documentação e ter teste, medida no próprio projeto. A seção 9 existe
para que esse caso não se repita: hoje a suíte falha sozinha, com o nome da
função na mensagem, antes de qualquer coisa chegar ao banco real.
