# EXIT GATE — Fase 01, Live Foundation

**Veredito: `PHASE 01: PARTIAL`** · 2026-09-03

Um único critério não fecha, e ele não é técnico: **ninguém usou o sistema
com dado real ainda.** Tudo o mais está entregue e verificado.

O gate podia ser declarado PASS com uma frase generosa sobre "dogfood em
andamento". Não é o que o `00_EXECUTION_KERNEL.md` pede, e um gate que se
deixa passar é um gate que não vale nada na fase seguinte, quando o critério
for mais caro.

## Como este veredito foi apurado

Comandos rodados hoje, não lembrança de terem passado um dia:

```
npm test                    → 5 arquivos, 34 testes, verde
npx tsc --noEmit            → limpo
npm run lint                → limpo
npm run build               → 11 rotas, nada vazando de _fase03/
supabase/tests/verify.sh    → RLS TEST: PASS
curl /login                 → 200, servindo a versão de email+senha
curl /api/cron/keepalive    → 401 sem credencial
```

Estado do banco em produção, consultado direto: **1 organização, 1 profile, 0
projetos, 0 state_items, 0 events, 0 candidates.**

Esses zeros são o gate.

## Critérios de ACEITE, um a um

| # | Critério | Estado |
|---|---|---|
| 1 | URL de produção | ✅ https://feel-cerebro.vercel.app |
| 2 | Auth funcionando | ✅ login real confirmado (`auth.users.last_sign_in_at`, 2026-09-02 20:50 UTC) |
| 3 | CRUD de projeto | ✅ código verificado; travava por bug de organização, corrigido e coberto por teste |
| 4 | Objetivo | ✅ |
| 5 | NOW | ✅ imposto por índice único parcial |
| 6 | NEXT ≤ 3 | ✅ imposto por check constraint; recusa agora tem mensagem |
| 7 | NOT NOW | ✅ ilimitado por design |
| 8 | Candidate por Quick Capture | ✅ ⌘K, rascunho preservado em caso de falha |
| 9 | Recent Changes | ✅ determinístico, a partir de `events` |
| 10 | RLS verificada (allow **e** deny) | ✅ três personas, incluindo o forasteiro |
| 11 | Migrations aplicadas | ✅ 0001..0005 |
| 12 | **Dogfood** | ❌ **zero projetos, zero eventos** |

## Checklist do plano mestre (itens 24, 25, 28, 30)

| Item | Estado |
|---|---|
| 24 — unit: `NEXT ≤ 3`, validação de state | ✅ `src/lib/state-rules.test.ts` |
| 25 — E2E do fluxo crítico | ✅ escrito (`e2e/fase01.spec.ts`), **desligado por padrão** — ver ressalva abaixo |
| 28 — `ARCHITECTURE.md`, `SCOPE.md`, `SECURITY.md`, 5 ADRs mínimos | ✅ 7 ADRs (os 5 do kit + os 2 que a execução produziu) |
| 30 — fechar o gate | este documento |

**Ressalva honesta sobre o item 25:** o E2E existe, tipa, e a suíte roda —
mas ele nunca foi executado de ponta a ponta contra um alvo, porque não há
instância descartável. Rodá-lo contra produção criaria projeto e eventos de
teste, contaminando exatamente a matéria-prima que a Fase 02 vai medir. Então
o que existe é um teste **escrito e não exercitado**, o que é melhor que nada
e pior que um teste verde. Está registrado como o que é.

## Requisitos de FALHAS

O plano pedia dois comportamentos que não existiam e agora existem:

- *"Supabase pausado → mensagem clara, não tela branca"* → `DataError`. O modo
  de errar era pior que tela branca: a página renderizava o empty state e
  afirmava "nada ainda" quando a query tinha falhado.
- *"Sessão expirada → volta ao login sem perder rascunho de captura"* → o
  Quick Capture só limpa o campo depois da confirmação de escrita.

## Dois bugs encontrados e corrigidos no caminho do gate

1. **Bootstrap de organização não retentava.** Profile criado antes da
   migration 0005 nunca ganhava organização, e criar projeto falhava em
   silêncio. Corrigido em `lib/org-bootstrap.ts`, com teste de regressão que
   foi **visto falhando** com o bug reintroduzido.
2. **Toda Server Action falhava muda.** Corrigido como convenção, não como
   remendo pontual (ADR-0007).

## O que impede o PASS, e de quem depende

**Dogfood.** Criar o projeto "Feel" de verdade, com objetivo real, NOW real,
NEXT real, as ideias de mapa e super-app em NOT NOW, e uma primeira captura
real. É ação do Gabriel (e depois de Gabrielle e Axel) — não há como eu criar
isso por vocês sem inventar o conteúdo, que é justamente o que tornaria o
dogfood inútil.

A Fase 02 tem como pré-condição literal *"01 PASS; events reais; dogfood
ativo"*. Ela mede quanto do tempo de reconstruir contexto cai só com
determinismo. **Sem uso real, ela mede ruído.**

## Pendências que não bloqueiam o gate

- `auth_leaked_password_protection` desabilitado no Supabase — apareceu junto
  com a senha. Um toggle no painel (`SECURITY.md §5`).
- Repositório público: reavaliar **antes da Fase 03**, que começa a promover
  conhecimento canônico para um repositório versionado (ADR-0004).
- `src/_fase03/` continua parado, fora do build, esperando a Fase 03.

## Pronto para a Fase 02?

**Ainda não** — e o que falta é uma tarde de uso, não uma sprint de código.
Assim que existirem `events` de uso verdadeiro, este documento vira
`PHASE 01: PASS` e a 02 começa com base medível em vez de suposta.
