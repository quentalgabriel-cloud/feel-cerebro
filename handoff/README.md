# Handoff — Project OS / Cérebro da Feel

Pacote para abrir uma thread nova sem perder o que foi aprendido até aqui.
Escrito em 2026-09-02, no fim da Fase 01.

## Como usar

Cole `00-PROMPT-DE-ABERTURA.md` na thread nova e anexe o projeto (o zip, ou
o repositório). É o único arquivo que se cola — os outros são leitura que o
prompt manda fazer, na ordem.

## Os arquivos

| Arquivo | O que responde | Leia quando |
|---|---|---|
| **`00-PROMPT-DE-ABERTURA.md`** | O prompt de boot, com as regras que valem para tudo. | Sempre — é o que se cola. |
| **`01-ESTADO-REAL.md`** | O que existe de fato, com IDs, o que está bloqueado e em quem. | Antes de propor qualquer coisa. |
| **`02-APRENDIZADOS.md`** | As armadilhas já pagas com bug real, escritas como regra generalizável — incluindo meus erros de raciocínio. | Antes de escrever SQL ou mexer em autorização. |
| **`03-METODO-E-GOVERNANCA.md`** | Como se trabalha aqui: harness de verificação, protocolo de execução, princípios. | Antes da primeira entrega. |
| **`04-ARQUITETURA-ADIANTE.md`** | O que o kit Project OS ensinou, o que ainda não existe, e as decisões em aberto. | Ao planejar a próxima fase. |

## O que este pacote não é

Não substitui `MASTER-IMPLEMENTATION-PLAN.md` (o plano congelado, com
D-01..D-16 e os contratos das Fases 01-09), `CEREBRO-DA-FEEL.md` (o porquê)
nem `docs-kit/` (os prompts de fase originais, preservados como fonte). Ele
existe para o que **não estava em lugar nenhum**: o estado verificado, as
lições que só existiam no histórico de uma conversa, e a leitura de para
onde a arquitetura deve ir.

## Se for ler só uma coisa

`02-APRENDIZADOS.md`, item 1. Uma subquery dentro de uma policy de RLS é ela
mesma filtrada por RLS — e foi assim que um usuário de fora conseguiu
entrar numa organização alheia, num teste, antes de chegar em produção.
