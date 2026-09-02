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

Os itens 1, 2 e 3 foram pegos por ele. Nenhum chegou a existir em produção.
