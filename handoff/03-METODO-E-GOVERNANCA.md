# Método e governança — como se trabalha neste projeto

Isto não é preferência de estilo. Cada regra aqui existe porque a ausência
dela custou alguma coisa — em bug, em retrabalho ou em confiança.

## 1. O harness de verificação local

**O que é.** `supabase/tests/verify.sh` sobe um cluster Postgres
descartável de verdade (`initdb` + `pg_ctl`, porta 5433, socket em `/tmp`),
cria um banco novo, aplica em ordem:

```
_supabase_stub.sql   → reprodução local dos roles anon/authenticated/
                       service_role, da tabela auth.users, da função
                       auth.uid() (lendo o GUC request.jwt.claims) e das
                       tabelas de storage
0001..000N.sql       → todas as migrations, na ordem real
rls_test.sql         → a suíte
```

e derruba o banco num `trap EXIT`. É idempotente: rodar de novo não suja
nada.

**Por que existe.** Migration aplicada em produção não tem `undo`. E o
Supabase não te avisa que uma policy vaza — ele obedece a policy.

**O que a suíte testa.** Três personas dentro de uma transação com
`ROLLBACK`, usando `set local role` + `set local request.jwt.claims` para
simular usuários diferentes contra o mesmo schema:

- **Ana** — dona da organização Acme
- **Carla** — leitora na Acme
- **Bruno** — dono da Beta, **o forasteiro**: existe para provar o que ele
  *não* consegue

E cobre, para cada uma, **allow e deny**:

| # | Verifica |
|---|---|
| 1 | anônimo não vê nada |
| 2 | Ana vê só a Acme |
| 3 | Bruno não vê nada da Acme, **e escrever na Acme falha** |
| 4 | Carla lê mas não escreve |
| 4b | auto-inclusão numa org vazia funciona; Bruno se inserir numa org populada **falha** |
| 5 | NOW=1 e NEXT≤3 são impostos pelo banco |

**A regra que importa:** um teste que só prova que o dono enxerga os
próprios dados não prova nada. O bug mora sempre no caso "quem não deveria".
Os casos 3 e 4b são os que pegaram vazamento real.

## 2. Protocolo de execução

Herdado do `docs-kit/00_EXECUTION_KERNEL.md`. Cada fase percorre:

```
INSPECT → RECONCILE → PLAN DELTA → IMPLEMENT → MIGRATE → TEST →
VERIFY → DEPLOY → VERIFY PRODUCTION → DOGFOOD → DOCUMENT → CLOSE GATE
```

Dois passos são os que costumam ser pulados e são justamente os que pegam
bug:

- **VERIFY PRODUCTION** — deploy sem erro não é prova. Bater no endpoint e
  ler a resposta é. Foi assim que apareceram o 404 de `/inbox` e o cron
  redirecionado para `/login`.
- **DOGFOOD** — usar de verdade, com dado real. Sem isso a fase seguinte
  parte de premissa não testada.

## 3. Desvio de arquitetura exige registro formal

O plano mestre tem 16 decisões fechadas (D-01..D-16). Contrariar qualquer
uma **não** se faz implementando: escreve-se um `ARCHITECTURE DEVIATION`
com qual decisão, por quê, o que quebra, e o custo de **não** mudar — e
espera-se resposta humana.

O ponto não é burocracia: é que decisão revisada em silêncio some, e daqui a
seis meses ninguém sabe se foi escolha ou acidente. É o mesmo problema que o
Project OS existe para resolver, aplicado a ele mesmo.

## 4. Princípios que o código segue

1. **Autorização mora no banco.** Server Actions são endpoints; a UI nunca
   é garantia. Quem impõe é RLS e constraint.
2. **Nada é sobrescrito em silêncio.** Migration superada vai para
   `superseded/`; código parado fica parado com explicação (`_fase03/`);
   tentativa errada fica documentada no cabeçalho do arquivo que a
   corrigiu — inclusive as que não funcionaram, porque a próxima pessoa
   precisa saber *por que* a solução não é a óbvia.
3. **Empty state honesto.** Nenhuma tela finge ter dado. MEMORY avisa na
   cara que o que está ali é captura, não conhecimento canônico.
4. **Falha de log nunca bloqueia a ação do usuário.** `logEvent()` engole o
   próprio erro de propósito.
5. **Ausência não vaza existência.** Projeto que a RLS esconde responde
   `notFound()`, não 403 — 403 confirmaria que existe.
6. **Documentação desatualizada é bug.** Corrigi-la faz parte da entrega
   que a invalidou.

## 5. A separação que o sistema inteiro existe para preservar

> **Captura é barata e automática. Conhecimento canônico é caro e exige
> decisão humana.**

Nada vira conhecimento por acidente. Quick Capture grava `candidate`;
promover para Markdown versionado é ato deliberado, com proveniência. Toda
vez que uma decisão de produto ameaçar essa fronteira — "e se a IA promover
sozinha?" — a resposta padrão é não, e mudar isso é `ARCHITECTURE
DEVIATION`.

Corolário que vale para a Fase 06 em diante: **síntese pode criar
Candidate; nunca promove.**

## 6. Verificação mínima antes de qualquer entrega

```bash
supabase/tests/verify.sh                                   # → RLS TEST: PASS
cd app && npx tsc --noEmit && npm run lint && npm run build
```

E, como o repositório é público (decisão do Gabriel, 2026-09-02), varredura
de segredo na árvore **e no histórico** antes de cada push. Segredo
commitado em repo público está vazado: a resposta é rotacionar a
credencial, não apagar o commit.
