# Cérebro da Feel

Sistema de memória organizacional dos três sócios da Feel — Gabriel,
Gabrielle e Axel. Resolve um problema específico: decisão tomada em
conversa some, contexto vira só o que quem estava lá lembra, e quem chega
depois não tem como reconstruir o porquê de nada.

A aposta central é uma separação que o sistema inteiro existe pra
preservar:

> **captura é barata e automática · conhecimento canônico é caro e exige
> decisão humana.**

Nada vira conhecimento por acidente. Tudo que é capturado fica como
candidato até alguém decidir promover.

**No ar:** https://feel-cerebro.vercel.app

## Estado atual

Fase 01 (**Live Foundation**) em produção: autenticação por magic link,
multi-tenancy com RLS, e a camada de orientação — um NOW, até três NEXT,
o resto em NOT NOW — com os limites impostos pelo banco, não pela
aplicação.

Fases 02 em diante (continuidade, memória federada, recuperação, trace)
estão especificadas e não começadas. O caminho está em
[`MASTER-IMPLEMENTATION-PLAN.md`](MASTER-IMPLEMENTATION-PLAN.md).

## Por onde começar a ler

| Arquivo | O que responde |
|---|---|
| [`CEREBRO-DA-FEEL.md`](CEREBRO-DA-FEEL.md) | **O porquê.** O problema, o modelo híbrido Git/Postgres, a governança. Comece aqui. |
| [`MASTER-IMPLEMENTATION-PLAN.md`](MASTER-IMPLEMENTATION-PLAN.md) | **O plano congelado.** 16 decisões fechadas, contratos de fase, registro de risco. Mudar arquitetura congelada exige registro formal de desvio. |
| [`RECONCILIACAO-PROJECT-OS.md`](RECONCILIACAO-PROJECT-OS.md) | O cruzamento com o kit Project OS e o que foi decidido em cada conflito. |
| [`MODELO-DE-DADOS.md`](MODELO-DE-DADOS.md) | O modelo original single-tenant. Superado pelo schema atual, mantido porque explica decisões que ele ainda carrega. |
| [`SETUP-INFRAESTRUTURA.md`](SETUP-INFRAESTRUTURA.md) | O estado real da infra — e o histórico dos erros do caminho, inclusive os conselhos errados e a correção de cada um. |

## Estrutura

```
app/                 Next.js 16 (App Router). Ver app/README.md.
supabase/
  migrations/        Schema aplicado, em ordem. Nada é editado depois de aplicado.
  tests/             verify.sh + rls_test.sql — Postgres descartável, allow e deny.
  superseded/        Schema single-tenant original. Preservado, não apagado.
docs-kit/            Prompts de fase do Project OS, íntegros, como fonte.
```

## Verificar antes de mexer

```bash
supabase/tests/verify.sh    # sobe Postgres descartável, aplica migrations, roda RLS
cd app && npx tsc --noEmit && npm run lint && npm run build
```

O `verify.sh` não é formalidade: foi ele que pegou três bugs reais de
segurança — um vazamento de RLS entre organizações incluído — antes de
chegarem no banco de produção.

## Princípios que o código segue

1. **Autorização mora no banco.** Server Actions são alcançáveis por POST
   direto; a UI nunca é a garantia. Quem impõe é o RLS.
2. **Nada é sobrescrito em silêncio.** Migration superada vai pra
   `superseded/`, código parado vai pra `_fase03/`, tentativa errada fica
   documentada no cabeçalho do arquivo que a corrigiu.
3. **Empty state honesto.** Nenhuma tela finge ter dado que não tem.
4. **Falha de log nunca bloqueia a ação do usuário.**
