# ADR-0005 — Grafo sem graph database

**Estado:** Aceito · 2026-08 (registrado formalmente em 2026-09-03)

## Contexto

O sistema vai relacionar decisões, hipóteses, evidências, perguntas e specs —
e a Fase 05 promete explorar essas relações visualmente. A conclusão
automática costuma ser "então precisa de Neo4j".

O kit corrige a premissa antes de ela virar decisão: **Focus Graph, não
Global Graph.** Grafo inteiro é bonito e inútil; o que serve é a vizinhança
do que você está olhando agora.

## Decisão

As relações vivem em Postgres, em tabela de arestas com origem, destino e
tipo. Sem graph database. A Fase 05 responde perguntas de vizinhança —
**Why? · Evidence · Dependencies · Implementation · Supersession · Impact** —
com SQL, e desenha a partir do resultado.

Consequência de projeto que vem junto: **as queries vêm antes da UI.** Sem
query respondida, não se desenha grafo.

## Alternativas descartadas

**Neo4j ou similar.** Um serviço a mais para operar, uma linguagem a mais
para manter, uma segunda autoridade sobre relações que já vivem ao lado do
resto do dado — e sem RLS, ou seja, a autorização multi-tenant teria que ser
reimplementada ali. O ganho real seria travessia profunda de muitos saltos,
que **não é** o que um Focus Graph faz.

**Extensão de grafo no próprio Postgres (Apache AGE).** Menos pior que um
serviço separado, ainda assim uma linguagem e uma superfície a mais para
resolver consultas de 1 a 2 saltos que um `join` resolve.

**Nada de relações explícitas — só busca semântica.** Confunde "parece
relacionado" com "foi decidido que se relaciona". A relação é dado
declarado, com autoria; não é inferência.

## Consequências

**Bom.** Zero infraestrutura nova. Relação herda a RLS que já protege o
resto. Reconstruível do Git junto com o índice (ADR-0002), porque as relações
moram no frontmatter.

**Ruim, e assumido.** Travessia profunda em SQL recursivo é mais trabalhosa
de escrever, e consulta de muitos saltos ficaria lenta — se algum dia
precisarmos dela. A aposta explícita é que não vamos precisar.

## Gatilho de revisão

O `EXIT GATE` da Fase 05 pergunta literalmente **"graph DB necessário?"**, com
resposta esperada **NÃO**. Se as consultas de vizinhança exigirem travessia
profunda recorrente, ou o SQL recursivo virar o gargalo real medido (não
suposto), esta decisão volta à mesa com dado na mão.
