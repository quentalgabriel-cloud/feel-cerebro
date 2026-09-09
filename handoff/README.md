# Handoff — Project OS / Cérebro da Feel

Pacote para abrir uma sessão nova — em qualquer ferramenta — sem perder o que
foi aprendido até aqui.

Escrito em 2026-09-02, no fim da Fase 01. **Revisado em 2026-09-09**, quando
a ponte entre Git e web ficou pronta e o desenvolvimento passou para o Codex
rodando na máquina do Gabriel.

## Como usar

Cole `00-PROMPT-DE-ABERTURA.md` na sessão nova e aponte o repositório (ou
anexe o zip). É o único arquivo que se cola — os outros são leitura que o
prompt manda fazer, na ordem.

## Os arquivos

| Arquivo | O que responde | Leia quando |
|---|---|---|
| **`00-PROMPT-DE-ABERTURA.md`** | O prompt de boot, com as regras que valem para tudo. | Sempre — é o que se cola. |
| **`05-CODEX.md`** | O que muda ao rodar na máquina do Gabriel: sem MCP, com credencial de Git. Como aplicar migration, rodar o harness no Windows e o que nunca fazer. | Se a ferramenta é o Codex, ou qualquer agente local. |
| **`01-ESTADO-REAL.md`** | O que existe de fato, com números verificados, e o plano NOW/NEXT/LATER ancorado neles. | Antes de propor qualquer coisa. |
| **`02-APRENDIZADOS.md`** | As armadilhas já pagas com bug real, escritas como regra generalizável — incluindo meus erros de raciocínio. | Antes de escrever SQL ou mexer em autorização. |
| **`03-METODO-E-GOVERNANCA.md`** | Como se trabalha aqui: harness de verificação, protocolo de execução, princípios. | Antes da primeira entrega. |
| **`04-ARQUITETURA-ADIANTE.md`** | O que o kit Project OS ensinou, o que ainda não existe, e as decisões em aberto. | Ao planejar a próxima fase. |

## O que este pacote não é

Não substitui `MASTER-IMPLEMENTATION-PLAN.md` (o plano congelado, com
D-01..D-16 e os contratos das Fases 01-09), `CEREBRO-DA-FEEL.md` (o porquê),
`docs/` (arquitetura, escopo, segurança e os ADRs) nem `docs-kit/` (os
prompts de fase originais, preservados como fonte). Ele existe para o que
**não estava em lugar nenhum**: o estado verificado, as lições que só viviam
no histórico de uma conversa, e a leitura de para onde a arquitetura vai.

## Se for ler só duas coisas

**`02-APRENDIZADOS.md`, item 1.** Uma subquery dentro de uma policy de RLS é
ela mesma filtrada por RLS — e foi assim que um usuário de fora conseguiu
entrar numa organização alheia, num teste, antes de chegar em produção.

**`02-APRENDIZADOS.md`, item 2b.** A mesma lição já estava escrita, por mim,
e eu a repeti uma semana depois. É o argumento mais forte deste pacote de que
documentação não substitui teste — e o que finalmente resolveu foi um teste
que varre o catálogo do banco inteiro, não mais um parágrafo.

## Se for ler só um número

`01-ESTADO-REAL.md`, §1: **55 itens de conhecimento, 0 uploads, 0 eventos, 0
itens de NOW/NEXT.** O sistema está construído e quase não é usado. Qualquer
priorização que ignore isso vai produzir a décima peça de um produto com zero
uso.
