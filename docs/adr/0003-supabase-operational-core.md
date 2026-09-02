# ADR-0003 — Supabase como núcleo operacional

**Estado:** Aceito · 2026-08 (registrado formalmente em 2026-09-03)

## Contexto

O sistema precisa de banco relacional, autenticação, storage de arquivo e
**autorização multi-tenant confiável** — três pessoas, projetos separados,
nenhuma podendo enxergar o que não é dela. Precisa disso rodando em produção
com custo próximo de zero, mantido por quem também está escrevendo o produto.

A decisão de multi-tenancy desde a primeira linha (D-01) faz da autorização o
requisito mais pesado da lista: retrofit de tenancy com dado real significa
reescrever toda a regra de acesso.

## Decisão

Supabase (Postgres 17.6, `sa-east-1`) como núcleo operacional: banco, Auth,
Storage e — o ponto principal — **RLS como camada de autorização**.

## Alternativas descartadas

**Postgres gerenciado puro (Neon, RDS) + auth próprio.** Autenticação
própria é superfície de segurança que ninguém aqui tem tempo de manter bem.
E RLS continuaria sendo escrita à mão de qualquer jeito.

**Firebase/Firestore.** Modelo de documento não combina com dado
relacional (organização → projeto → itens → eventos), e as regras de
segurança são uma linguagem própria — mais fraca, para o que precisamos, que
policies SQL testáveis com Postgres de verdade.

**Autorização na aplicação, banco burro.** É a alternativa que mais atrai e a
que este projeto recusa com mais convicção: Server Action é endpoint
alcançável por POST direto, e regra que mora só no código da aplicação é
regra que uma requisição fora da UI ignora.

## Consequências

**Bom.** Autorização fica a uma camada do dado, não a três. Invariantes de
domínio viram constraint (NOW = 1, NEXT ≤ 3). Auth, storage e banco falam a
mesma identidade.

**Ruim, e assumido.**
- Policy errada vaza dado silenciosamente — o Supabase obedece a policy, não
  avisa que ela está errada. Mitigação: `supabase/tests/verify.sh`, com
  Postgres descartável, migrations em ordem e teste de **deny** obrigatório.
  Pegou três vazamentos antes de existir usuário.
- `SECURITY DEFINER` em `public` vira endpoint RPC pelo PostgREST. Funções de
  autorização vivem no schema `private`.
- Plano gratuito pausa projeto por inatividade — daí o cron semanal de
  keepalive.
- Configuração de Auth (Site URL, allow-list de redirect) vive só no painel,
  fora do versionamento e fora de qualquer ferramenta automatizável. Custou um
  bug e uma troca de mecanismo de login (ADR-0006).

## Gatilho de revisão

Limite do plano gratuito (2 projetos ativos por pessoa, somando todas as
organizações onde se é Owner ou Administrator) virar impedimento real, ou o
projeto deixar de ser protótipo interno.
