# Arquitetura adiante — o que o kit ensinou e o que ainda não existe

## 1. De onde veio o salto conceitual

O sistema começou como "inbox + promoção para Markdown no Git": captura,
revisão, commit. Funcionava, e era pequeno demais.

O que mudou a escala foi a leitura do **Project OS prompt kit**
(`docs-kit/`, preservado íntegro como fonte — não reescrito). Ele não trouxe
código; trouxe um vocabulário que expôs o que faltava. A reconciliação
completa está em `RECONCILIACAO-PROJECT-OS.md`; o achado central foi
desconfortável e continua verdadeiro:

> **Não existia camada de orientação.** O sistema sabia guardar. Não sabia
> dizer o que importa agora.

Cinco ideias do kit são hoje estruturais:

**1. Quatro camadas, não uma.** `STATE` (o que é verdade agora) · `MEMORY`
(o que aprendemos e decidimos) · `TRACE` (como chegamos aqui) ·
`CONTINUITY` (como retomar sem reconstruir tudo). Cada uma tem autoridade
própria; misturá-las é o que faz sistema de conhecimento virar pântano.

**2. Source ≠ Candidate ≠ Canonical ≠ Index ≠ Derived.** Cinco naturezas
distintas, com regras distintas. `Source` é bruto e imutável; `Candidate`
espera decisão; `Canonical` é Markdown versionado no Git; `Index` e
`Derived` são **100% reconstruíveis** — e se não são, há duas verdades. Foi
essa régua que condenou a `notas_promovidas` (D-07): ela guardava campos que
não existiam no Markdown, logo o índice não reconstruía.

**3. Autoridade por domínio.** Cada fato tem **um** dono. Git é autoridade
do conhecimento canônico; Postgres é autoridade do estado; GitHub e Vercel
são autoridade da execução — guardamos referência, não verdade. Duas
autoridades para o mesmo fato é o defeito que o Kernel §8 proíbe, e foi por
isso que `escopo` (`pessoal|feel|cliente:`) foi aposentado como tenancy em
favor de `project_id` + RLS (D-06).

**4. NOW=1, NEXT≤3, o resto NOT NOW.** Restrição, não sugestão — imposta
pelo banco. O valor está na dor de escolher: uma lista de 40 prioridades não
tem nenhuma.

**5. Focus Graph, não Global Graph.** Grafo inteiro é bonito e inútil.
Vizinhança do que você está olhando é ferramenta. Consequência de projeto:
**as queries vêm antes da UI** — Why? · Evidence · Dependencies ·
Implementation · Supersession · Impact. Sem query respondida, não se
desenha grafo.

## 2. O que existe hoje

Só a Fase 01: STATE funcional, multi-tenant, com autorização no banco.
`MEMORY` tem captura mas não conhecimento; `TRACE` tem `events` append-only
mas nada que os atravesse; `CONTINUITY` não existe.

Ou seja: **a fundação é sólida e o edifício mal começou** — e isso é o
estado correto, porque a fundação é a parte cujo custo de errar é ordens de
grandeza maior.

## 3. Onde a complexidade real ainda está

As três fases seguintes são as que decidem se o sistema é sério.

### Fase 02 — Continuity Core: prove o valor *sem* IA

A pergunta que a fase existe para responder é honesta e arriscada: **quanto
do tempo de reconstruir contexto cai só com determinismo?**

A disciplina aqui é resistir a começar pela IA. Um agregador determinístico
de `events`, checkpoints e regras de atenção pode entregar a maior parte do
valor; se a IA entrar antes disso, ninguém saberá quanto dela era
necessária, e o sistema herda um custo e uma dependência sem evidência. A
métrica (TTRC antes/depois, medida na mão) é o que separa engenharia de fé.

**Pré-condição real:** dogfood. Sem `events` de uso verdadeiro, o Resume não
tem o que agregar e a fase mede ruído.

### Fase 03 — Federated Memory: onde os riscos altos moram

É aqui que o código parado em `_fase03/` acorda, adaptado ao vocabulário
novo (D-02: Decision · Hypothesis · Evidence · Question · Spec) e à
identidade dupla (D-08: UUID interno + display id `DEC-0001`).

Três riscos altos, todos já identificados:

- **Corrida de display id.** O `/api/promote` atual usa
  `order by criado_em desc limit 1` — com três pessoas promovendo, é corrida
  de verdade. Precisa de sequência transacional.
- **Índice que não reconstrói.** O teste de **reindex do zero a partir do
  Git** é critério de gate, não item opcional. Se o índice não renasce do
  Git, o Git deixou de ser autoridade.
- **Promoção parcial** — commit feito, linha não gravada. Precisa de falha
  segura: Git indisponível → candidate **não** promovido, e o E2E de falha
  é obrigatório.

**Duas pré-condições duras que ainda não existem:** o repositório de
conhecimento separado (D-04) e o token com escrita (D-05).

> **Nota de 2026-09-09 — esta previsão foi executada; o texto acima fica
> como registro do que se antecipou.** O que mudou de fato:
>
> - O código de `_fase03/` **não acordou**. Continua parado. A promoção foi
>   reescrita do zero (`app/scripts/promote.mjs` + `memory/actions.ts`),
>   porque o desenho mudou: intenção e efeito são separados, e o app web
>   nunca escreve no Git.
> - **Corrida de display id** — resolvida por `public.next_display_id`,
>   sequência transacional por projeto e por tipo (migrations 0006/0009,
>   e 0011 que a tirou de `SECURITY DEFINER`).
> - **Índice que não reconstrói** — resolvido e *provado*:
>   `scripts/reindex.mjs` destrói e reconstrói, e a impressão md5 bateu
>   idêntica em duas reconstruções seguidas, nos dois repositórios.
> - **Promoção parcial** — resolvida pela ordem no worker: arquivo → commit
>   → push → e só então o banco. O pior estado possível virou fila parada.
> - **Pré-condições** — os dois repositórios de conhecimento existem
>   (`cerebro` e `ecossistema-feel`, privados). O token com escrita
>   **deixou de ser necessário**: quem escreve no Git é o worker, rodando
>   onde a credencial já existe, então nenhum token de escrita do GitHub
>   precisa viver na Vercel.
> - O vocabulário D-02 virou **seis classes** (decision · reasoning ·
>   insight · open-loop · project-state · source) mais um eixo `epistemic`
>   que absorve Hypothesis/Evidence sem criar classe nova — registrado na
>   DEC-013. Este é um desvio da D-02 que **ainda não tem
>   `ARCHITECTURE DEVIATION` escrito**; está na lista LATER de
>   `01-ESTADO-REAL.md` §7.

### Fase 04 — Retrieval: medir cada degrau antes de subir

Filtros estruturados → FTS do Postgres → chunks → embeddings → hybrid. A
regra é não pular para o semântico antes do FTS provar o próprio teto — e
registrar `ai_runs` com custo, latência e tokens desde a primeira chamada.

Dois princípios que precisam nascer aqui e valem para sempre:

- **Conteúdo recuperado é untrusted.** Texto de fonte nunca vira camada de
  instrução. Isso é a mesma disciplina do item 5 dos aprendizados —
  autorização não mora onde o dado do usuário chega — aplicada a prompt.
- **Permissão filtra antes do prompt, nunca depois.** Corpus = acesso do
  usuário ∩ escopo do projeto ∩ permissão da source.
- **"A evidência disponível é insuficiente" é resultado de sucesso.**
  Sistema que sempre responde está mentindo em algum lugar.

## 4. As decisões que continuam abertas

| # | Decisão | Quando decide |
|---|---|---|
| Eixos da Feel | `axes` é tabela vazia **por design** — depende dos três sócios definirem os eixos reais. Portão duplo com corpus canônico (D-11). | Antes da Fase 05 |
| Modelo de embedding | Não pinado. Benchmark PT / EN / misto / técnico (D-12). | Fase 04 |
| Reranking | DEFER. Trigger: eval da 04 mostrar ganho sobre hybrid (D-13). | Fase 04 |
| Renderer do grafo | Canvas 2D próprio é o padrão; `@xyflow/react` 12 entra se multi-seleção e "adicionar ao contexto" custarem mais para portar que para adotar (D-10). | Entrada da Fase 05 |
| GitHub App | PAT resolve a 03; App é obrigatório antes da 07 (webhooks, PRs, checks) (D-05). | Antes da Fase 07 |
| MCP | Portão explícito na Fase 08: só se o agente precisar consultar dinamicamente e o pacote estático for insuficiente. | Fase 08 |
| **Repo público** | Gabriel autorizou público (2026-09-02). **A Fase 03 promove conhecimento canônico para um repositório versionado** — enquanto for público, tudo que for promovido é público. | **Reavaliar antes da 03 ir ao ar** |

A última linha é a que mais importa e é nova: a decisão de manter público
foi tomada quando o repositório continha só código e documentação de
arquitetura. A Fase 03 muda a natureza do que vai para lá. Ou o repositório
de conhecimento (D-04, que é separado) nasce privado, ou essa autorização
precisa ser reconfirmada com o novo escopo em mente.

## 5. O que eu faria diferente se começasse hoje

- **Multi-tenancy desde a primeira linha** (D-01) — foi a decisão certa e
  quase não foi tomada. Coluna que nasce cedo custa nada; retrofit com dado
  real custa reescrever toda a RLS.
- **O harness de teste antes da primeira migration**, não depois da
  primeira migration duvidosa. Ele pagou três bugs de segurança antes de
  existir um usuário.
- **Identificadores em inglês desde o início** (D-16) — traduzir a cada
  fase gera atrito permanente e divergência entre plano e schema. A
  documentação e a UI seguem em português, que é o que os três leem.
- **Não escrever README antes do sistema estabilizar** — ou aceitar que
  reescrevê-lo faz parte de cada migração. O `app/README.md` passou semanas
  descrevendo rotas que não existiam mais.
