# ADR-0002 — Autoridade por domínio

**Estado:** Aceito · 2026-08 (registrado formalmente em 2026-09-03)

## Contexto

Sistema de conhecimento apodrece quando o mesmo fato tem duas fontes que
divergem: o Markdown diz uma coisa, a tabela diz outra, e ninguém sabe qual
está certa. O `00_EXECUTION_KERNEL.md` §8 chama isso de defeito, não de
detalhe de implementação.

A reconciliação com o Project OS kit encontrou um caso concreto já dentro do
projeto: `notas_promovidas` guardava campos que não existiam no Markdown —
logo o índice **não** era reconstruível do Git, logo o Git não era autoridade
de verdade.

## Decisão

Cada fato tem **um** dono. Todos os outros guardam **referência**, nunca
cópia da verdade.

| Domínio | Autoridade |
|---|---|
| Estado, tenancy, autorização, eventos | Postgres/Supabase |
| Conhecimento canônico | Git (Markdown versionado) |
| Código, deploy, execução | GitHub, Vercel |
| Identidade | Supabase Auth |

Corolário operacional: **`Index` e `Derived` são 100% reconstruíveis da
autoridade.** Se não renascem, existem duas verdades.

## Alternativas descartadas

**Postgres como autoridade de tudo, inclusive conhecimento.** Mais simples de
implementar e perde o que torna conhecimento durável: diff legível, histórico
por linha, revisão por PR, e leitura fora do sistema (Obsidian, GitHub, um
editor qualquer). Conhecimento preso num banco morre com o banco.

**Git como autoridade de tudo, inclusive estado.** Estado muda muitas vezes
por dia e é consultado por RLS; commit por mudança de NOW seria absurdo, e
autorização por arquivo não existe.

**Duplicar e sincronizar.** É a opção que parece pragmática e é exatamente o
defeito: duas verdades com um job no meio esperando divergir.

## Consequências

**Bom.** Toda pergunta de "onde isso mora?" tem resposta única. O teste de
**reindex do zero a partir do Git** vira critério de gate da Fase 03, não
item opcional — se o índice não renasce, a autoridade é mentira.

**Ruim, e assumido.** Promoção de conhecimento fica sendo uma operação
distribuída (commit no Git + linha no índice), com falha parcial possível.
A resposta é falha segura: Git indisponível → candidate **não** é promovido,
com E2E de falha obrigatório.

## Gatilho de revisão

O teste de reindex do zero se mostrar impraticável na Fase 03 — o que
significaria que o Git não está funcionando como autoridade, e a decisão
precisa ser refeita explicitamente em vez de erodir na prática.
