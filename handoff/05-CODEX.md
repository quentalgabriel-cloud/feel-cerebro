# Operar este projeto pelo Codex / ChatGPT

Escrito em 2026-09-09, quando o desenvolvimento passou das sessões Claude
para o Codex rodando na máquina do Gabriel.

Os outros arquivos do handoff valem inteiros e não mudam por causa da troca
de ferramenta — o que muda é **o que você tem na mão**. Este arquivo é só
isso: o que você ganha, o que você perde, e como fazer sem o que falta.

---

## 1. O que muda

As sessões anteriores rodavam num container na nuvem, com MCP do Supabase e
da Vercel, e **sem credencial de Git**. Você é o inverso disso.

| | sessão Claude na nuvem | você, Codex local |
|---|---|---|
| `git push` | **bloqueado** (proxy recusa com 403) | **funciona** — credencial do Windows |
| Aplicar migration | MCP `apply_migration` | não tem — ver §3 |
| Ler advisors de segurança | MCP `get_advisors` | não tem — ver §3 |
| Consultar produção | MCP `execute_sql` | não tem — ver §3 |
| Estado do deploy | MCP da Vercel | painel, ou `git push` e olhar |
| Rodar o harness de RLS | Postgres no container | precisa de um — ver §4 |
| Arquivos do PC | ponte remota, lenta | **direto**, é a sua máquina |

O ganho é real: **você fecha o ciclo sozinho.** As sessões anteriores
precisavam gerar um bundle e pedir para a máquina do Gabriel empurrar. Você
commita e empurra na mesma execução. Use isso — mas leia §5 antes.

---

## 2. Primeira coisa a fazer

Nesta ordem, antes de escrever qualquer linha:

1. `handoff/01-ESTADO-REAL.md` — o que existe hoje, com números verificados.
   Começa com o dado mais importante do projeto: **o sistema está construído
   e quase não usado.**
2. `handoff/02-APRENDIZADOS.md` — as armadilhas já pagas com bug real. Leia
   pelo menos os itens 1, 2 e **2b** antes de tocar em SQL ou autorização.
3. `handoff/03-METODO-E-GOVERNANCA.md` — o protocolo e o harness.
4. `MASTER-IMPLEMENTATION-PLAN.md` — o plano congelado, D-01..D-16.
5. `docs/SECURITY.md` — as quatro armadilhas, em versão curta.

Depois diga ao Gabriel (a) o que entendeu que está pronto, (b) o que está
bloqueado, (c) qual você acha que é o próximo movimento e por quê. Só então
código.

---

## 3. Como fazer o que o MCP fazia

### Aplicar uma migration

Não existe caminho automatizado configurado. Duas opções, nesta preferência:

**a) Supabase CLI** (melhor, deixa rastro):

```bash
npx supabase link --project-ref rvctaywzzipimrpjfkqi
npx supabase db push
```

**b) SQL Editor do painel** — cole o conteúdo do arquivo `.sql` inteiro e
execute. Funciona, mas o painel não registra qual arquivo do repo gerou
aquilo; se usar, diga no commit que a aplicação foi manual.

**Em qualquer caso, a migration passa por `verify.sh` ANTES de tocar o banco
real.** Não é cerimônia: esse harness pegou três vazamentos entre
organizações antes de existirem.

### Ler os advisors de segurança

Painel → Advisors → Security. Rode **depois de toda migration**. Foi ele que
pegou o item 2b dos aprendizados, uma semana depois de o furo estar em
produção.

### Consultar produção

SQL Editor do painel. Para checar autorização de verdade, sempre dentro de
uma transação revertida e **assumindo o papel `authenticated`** — sem isso
você está testando superusuário e chamando de usuário:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<auth_user_id>","role":"authenticated"}';
-- ... a consulta que você quer provar ...
rollback;
```

Rodar como `postgres` **ignora RLS**. Um teste assim passa verde provando
nada — já aconteceu neste projeto.

---

## 4. Rodar o harness no Windows

`supabase/tests/verify.sh` é bash e espera `initdb`/`pg_ctl` num Linux. Na
sua máquina, em ordem de preferência:

1. **WSL** — `wsl bash supabase/tests/verify.sh` com `postgresql-16`
   instalado dentro do WSL. É o caminho mais fiel ao que o script assume.
2. **Docker** — subir `postgres:16`, criar um banco e aplicar na mão, na
   ordem: `_supabase_stub.sql`, depois `supabase/migrations/*.sql` em ordem
   lexicográfica, depois `rls_test.sql`. É literalmente o que o script faz.
3. **`supabase start`** (CLI, precisa de Docker) — sobe um stack local; use
   o Postgres dele como alvo dos mesmos três passos.

A saída esperada, e a única que conta como verde:

```
RLS TEST: PASS
```

O `_supabase_stub.sql` existe para o banco local começar **igual ao Supabase
começa** — papéis `anon`/`authenticated`/`service_role`, `auth.uid()`,
`storage.foldername()`, default privileges, e `pgcrypto` em `extensions`.
Se você descobrir mais alguma diferença entre o stub e a produção,
**corrigir o stub faz parte da entrega** — laboratório diferente da produção
é a única coisa que um teste verde não consegue avisar.

---

## 5. O que nunca fazer aqui

Estas não são preferências de estilo. Cada uma custou um bug real.

- **Não mude arquitetura congelada em silêncio.** Se sua proposta contraria
  D-01..D-16, escreva um `ARCHITECTURE DEVIATION` — qual decisão, por quê, o
  que quebra, e o custo de não mudar — e espere resposta do Gabriel.
- **Não ponha autorização na UI.** Server Actions são alcançáveis por POST
  direto. Regra que só existe no componente não existe.
- **Não crie função em `public` sem `revoke execute ... from anon`.** Ela
  nasce executável por `anon` por default do PostgreSQL, o PostgREST publica
  tudo que está em `public`, e a seção 9 do `rls_test` vai quebrar. Se ela
  precisa de poder emprestado, mora em `private`.
- **Não acredite que revogou acesso até o `proacl` concordar.** Ver
  aprendizado 2b. Já errei isso duas vezes, pelos dois lados.
- **Não teste só o caminho feliz.** Um teste que prova que o dono vê os
  próprios dados não prova nada; o bug mora em quem *não* deveria ver.
- **Não escreva comando que parece proteger e não protege.** Se não mediu,
  não afirme. Ver o corolário do 2b.
- **Não sobrescreva em silêncio.** Migration superada vai para
  `superseded/`; tentativa errada fica documentada no cabeçalho do arquivo
  que a corrigiu.
- **Não deixe tela fingir que tem dado.** Falha de leitura não pode aparecer
  como estado vazio — existe `<DataError>` para isso. Server Action que
  retorna mudo é formulário que mente (ADR-0007).
- **Não faça o `promote.mjs` tocar o banco antes do push.** A ordem é
  arquivo → commit → push → banco. Invertida, o acervo passa a afirmar que
  promoveu algo que não está no Git.
- **Não dê modo incremental ao `reindex.mjs`.** Ele existe para detectar
  divergência; incremental esconde exatamente isso.

---

## 6. Definição de pronto

Uma entrega só está pronta quando **todas** passam, e você viu a saída:

```bash
cd app
npx vitest run          # 43 testes hoje
npx tsc --noEmit
npx eslint .
npm run build
# e, se mexeu em SQL:
bash supabase/tests/verify.sh     # → RLS TEST: PASS
```

Mais: advisors do Supabase limpos depois de migration, documentação
corrigida na mesma entrega se sua mudança a invalidou, e — quando o efeito é
em produção — **a resposta vista**, não presumida. Deploy sem erro não é
prova de que o comportamento certo chegou lá.

---

## 7. Variáveis de ambiente

`app/.env.local` (não commitado; modelo em `app/.env.local.example`).
Para os scripts de linha de comando, além das do app:

```
CEREBRO_EMAIL=<o email do Gabriel no sistema>
CEREBRO_SENHA=<a senha dele>
```

Os scripts autenticam **como uma pessoa**, não com service role. É de
propósito: nenhum segredo novo entra no sistema, e a escrita passa pela RLS
de verdade — rodar o `reindex` também testa as policies.

Os dois comandos rodam **de dentro de `app/`**:

```bash
# reconstruir o índice a partir do vault
node scripts/reindex.mjs --repo <caminho-do-clone> --nome quentalgabriel-cloud/cerebro --projeto cerebro

# aplicar a fila de promoções
node scripts/promote.mjs --repo <caminho-do-clone> --nome quentalgabriel-cloud/cerebro
```

Os dois repositórios de conhecimento são **privados** e separados do repo de
código, por decisão (D-04): eles guardam estratégia.

---

## 8. Se você discordar do plano

Diga. Ele é congelado, não sagrado — e boa parte do que está escrito aqui
nasceu de alguém apontando que a versão anterior estava errada. O que não
vale é mudar sem registrar.
