# Segurança

Modelo de ameaça honesto para o que isto é: ferramenta interna de três
sócios, em repositório **público**, com dado estratégico real dentro do banco.

Estado em 2026-09-03.

## 1. O princípio

> **Autorização mora no banco.** A UI é conveniência; a RLS é a regra.

Toda Server Action é um endpoint alcançável por POST direto. Validação em
componente é UX, não segurança. Se a regra não está numa policy ou numa
constraint, ela não existe.

## 2. O que protege o quê

| Camada | Protege | Como |
|---|---|---|
| Supabase Auth | identidade | email + senha; sessão em cookie httpOnly gerida pelo `@supabase/ssr` |
| `proxy.ts` | rotas | sem sessão → `/login`. Exclui `/api/*`, que se autentica sozinho |
| **RLS** | dados | policies por `organization_members`; anônimo não vê nada |
| Schema `private` | decisões de autorização | PostgREST não expõe; `public` exporia como RPC |
| Constraints | invariantes | NOW = 1 (índice único parcial), NEXT ≤ 3 (check) |
| `CRON_SECRET` | `/api/cron/keepalive` | bearer token; sem ele, **401** |

## 3. Quatro armadilhas já pagas com bug real

Estão aqui porque são erros que **parecem** corretos no code review.

**Subquery dentro de policy é filtrada pela própria RLS.** A policy de
bootstrap perguntava "esta organização já tem membros?" com um `not exists`
direto. Um usuário de fora via uma organização populada como **vazia** — a
subquery rodava sob a RLS dele, que escondia as linhas dos outros — e se
inseria em organização alheia. Correção: a checagem roda em função
`SECURITY DEFINER`, que enxerga tudo. **Sinal de alerta:** qualquer
`exists`/`count` dentro de policy.

**`SECURITY DEFINER` em `public` vira endpoint RPC.** Os helpers de
autorização eram chamáveis de fora. Revogar `EXECUTE` dos roles não adiantou
(o grant estava em `PUBLIC`); revogar de `PUBLIC` quebrou a RLS inteira
(policy avalia com o privilégio de quem consulta). A correção certa foi mover
para um schema não exposto. **"Revoguei o acesso" só é verdade quando
`pg_proc.proacl` concorda.**

**Constraint deferida não protege durante a transação.** NOW = 1 como unique
deferida só falhava no COMMIT; no meio da transação, dois NOW eram aceitos.
Virou índice único parcial, imediato.

**A quarta, e a pior: a lição escrita não impediu a repetição.** A migration
0009 expôs `public.next_display_id` como `SECURITY DEFINER` e escreveu
`revoke execute ... from public`, e eu li isso como "de fora ninguém executa".
O `proacl` dizia `anon=X/postgres` — concessão **nominal**, que o Supabase
adiciona por `alter default privileges`, e que revoke ao pseudo-papel PUBLIC
não toca. Foi o linter que viu, não eu, dois parágrafos abaixo da frase acima
neste mesmo arquivo.

Por isso a 0011 não se limitou a revogar. Ela tirou o `SECURITY DEFINER` de
cena — `knowledge_counters` já tem RLS com a mesma regra que o corpo checava à
mão, e o DEFINER estava justamente desligando essa RLS para pôr uma linha de
código no lugar de uma policy. E a seção 9 do `rls_test` passou a varrer o
catálogo inteiro, com três invariantes que não dependem de ninguém lembrar:

| # | invariante | por quê |
|---|---|---|
| a | nenhuma função de `public` é executável por `anon` | `public` é o schema que o PostgREST publica; ali, executável por `anon` = endpoint aberto |
| b | nenhuma função de `public` é `SECURITY DEFINER` | poder emprestado mora em `private`, fora do alcance da API |
| c | toda função de `public`/`private` tem `search_path` preso | solto, quem chama escolhe de onde vem cada nome |

As três foram verificadas quebrando de propósito, uma a uma. A (a) ainda
achou de brinde uma divergência entre o laboratório e a produção: o
`_supabase_stub.sql` instalava `pgcrypto` em `public`, e a produção instala em
`extensions` — 37 funções expostas no teste que nunca existiram no Supabase. O
stub foi corrigido; um banco de teste que não é igual ao real é a única coisa
que um verde não consegue avisar.

**A regra que sai disso:** documentar uma armadilha não protege contra ela.
Só teste que roda protege. Escrever a lição é o começo do trabalho, não o fim.

**E um comando que não faz nada é pior que nenhum comando.** A primeira
versão da 0011 trazia `alter default privileges in schema public revoke
execute on functions from public, anon` para fechar o problema na origem.
Medido em Postgres descartável, nas duas ordens possíveis: **não funciona** —
o revoke ao PUBLIC não materializa nada em `pg_default_acl` e o default
embutido volta a valer, então toda função nova nasce com `=X` no `proacl`. A
linha saiu do arquivo. Proteção que só parece proteção é a matéria-prima do
próximo bug desta lista.

Os três primeiros foram pegos por `supabase/tests/verify.sh` **antes de
existir usuário**. O quarto chegou a produção e ficou lá até o linter falar —
o que é exatamente a diferença entre ter teste e ter documentação.

## 4. Segredos

- Nunca no repositório. `.env.local` está no `.gitignore`; o `.env.local.example`
  lista os nomes, nunca os valores.
- `SUPABASE_SERVICE_ROLE_KEY` só existe server-side, e só em rota que precisa
  ignorar RLS de propósito (hoje: o cron de keepalive). **Nunca no caminho do
  primeiro acesso** — o bootstrap de organização é autorizado pela própria RLS.
- `NEXT_PUBLIC_*` são públicas por definição; quem protege o acesso é a RLS,
  não a obscuridade da chave.

**O repositório é público** (decisão do Gabriel, 2026-09-02). Consequência
direta: **segredo commitado é segredo vazado** — a resposta é *rotacionar a
credencial*, não apagar o commit. Varredura de segredo na árvore **e no
histórico** antes de cada push.

## 5. Autenticação: o que se ganhou e o que se perdeu

A troca de magic link por senha (ADR-0006) resolveu um bloqueio real, e tem
um custo que não se esconde: o magic link provava posse do e-mail a cada
entrada; senha não prova nada além de conhecer a senha.

Mitigações em vigor: **não há autocadastro** (conta que não foi provisionada
não existe), e a senha é gerada aleatória, não escolhida por humano. O que
falta, e está registrado como falta: sem 2FA, sem política de expiração, sem
rate limiting próprio além do que o Supabase Auth já aplica.

**Um aviso novo apareceu junto com a troca**, e é consequência direta dela: o
security advisor do Supabase acusa `auth_leaked_password_protection`
desabilitado. Com magic link não havia senha, então o aviso não existia. A
correção é um toggle no painel — Authentication → Providers → Password →
*Leaked password protection* —, que faz o Supabase checar a senha contra o
HaveIBeenPwned na definição. Vale ligar mesmo com senha aleatória, porque a
proteção passa a valer para qualquer senha escolhida por gente depois.
[Documentação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## 6. Ausência não vaza existência

Projeto que a RLS esconde responde `notFound()`, não 403 — um 403
confirmaria que o projeto existe. Vale para toda rota por slug.

## 7. Verificação obrigatória antes de qualquer entrega

```bash
supabase/tests/verify.sh                    # → RLS TEST: PASS
cd app && npm test && npx tsc --noEmit && npm run lint && npm run build
```

A suíte de RLS testa três personas — dona, leitora e **o forasteiro** — e
cobre **allow e deny**. Um teste que só prova que o dono enxerga os próprios
dados não prova nada: o bug mora sempre no caso "quem não deveria".

## 8. Limites conhecidos

Registrados porque limite não documentado vira surpresa:

- Sem auditoria de acesso (quem leu o quê). `events` registra escrita, não
  leitura.
- Sem backup próprio além do que o plano gratuito do Supabase oferece.
- Sem rate limiting nas Server Actions.
- Sem 2FA.
- O `service_role` do cron ignora RLS por construção: qualquer código novo
  nessa rota herda esse poder. Rota de service role é revisão obrigatória.

## 9. Se um segredo vazar

1. **Rotacionar** a credencial no painel de origem (Supabase / Vercel /
   GitHub). Apagar o commit não desvaza nada.
2. Atualizar a variável na Vercel e redeployar.
3. Registrar em `../SETUP-INFRAESTRUTURA.md` o que vazou, quando e o que foi
   rotacionado.
