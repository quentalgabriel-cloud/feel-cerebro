# Project OS × Cérebro da Feel — Reconciliação

> Executado sob `00_EXECUTION_KERNEL.md`, passos 1 (INSPECT) e 2 (RECONCILE).
> Nenhuma linha de código mudou nesta rodada — o próprio kit determina que o
> `00_IMPLEMENTATION_PLAN_FREEZE` não implementa, e o Kernel exige inspeção
> do estado real antes de tocar em arquivo. Data: 2026-09-01.
>
> Regra de precedência aplicada (README do kit): **estado real do repositório
> e da produção vem primeiro**, depois o contexto arquitetural congelado,
> depois os prompts de fase.

---

## 0. O que o kit é, sem eufemismo

O `project_os_prompt_kit` descreve um produto chamado **Project OS**: um
*continuity and reasoning control plane* para projetos desenvolvidos com IA.
A premissa é uma frase só, e é uma frase boa:

> **AI execution speed > human project comprehension speed.**

Ou seja: a IA produz mais rápido do que o humano consegue entender o que foi
produzido. O resultado é context debt, decision debt, state drift, perda de
rationale, fragmentação de fontes. O produto ataca isso com quatro perguntas:
**STATE** (onde estamos), **MEMORY** (o que sabemos/decidimos), **TRACE**
(por que existe e de onde veio), **CONTINUITY** (como continuar direito).

A arquitetura que ele congela é, quase item por item, a que já decidimos
sozinhos: Vercel + Supabase/Postgres como core operacional + Git-backed
Markdown como conhecimento canônico + promoção com revisão humana +
provenance obrigatório + pgvector + grafo sem banco de grafo + "IA sugere,
humano governa".

Isso não é coincidência boa de ignorar — é a evidência mais forte que
temos até agora de que o desenho do Cérebro da Feel está certo. Duas
linhas de raciocínio independentes chegaram na mesma arquitetura.

---

## 1. O que o kit confirma do que já construímos

Cada linha abaixo é uma decisão nossa que o kit valida de forma
independente. Nenhuma precisa mudar.

| Nossa decisão | Onde o kit diz o mesmo |
|---|---|
| Fronteira Git/Postgres por frequência de escrita | "Authority by domain": State→Postgres, Durable accepted knowledge→Git-backed Markdown |
| Promoção unidirecional, inbox → Git, nunca o contrário | Knowledge lifecycle: Source → Candidate → Human Review → Canonical |
| Promoção só conclui depois do commit no Git | 03: "Promotion só conclui depois do write canônico. Se Git falhar: Candidate continua pending/error, nunca promoted" |
| Nenhum campo de classificação obrigatório na captura | 01: Quick Capture "global e com baixa fricção", cria Candidate bruto `pending` |
| Relação tipada, com proponente, só vira verdade com confirmação humana | "Somente relações explicitamente confirmadas podem se tornar canônicas por padrão" |
| IA nunca promove sozinha | "A IA não pode silenciosamente: aceitar Decision, promover memória, criar relação canônica" |
| Nada é sobrescrito em silêncio; `status` muda, linha não some | "Current State ≠ History" + `supersedes` |
| Escopo imposto por RLS, não por convenção | Security: RLS, org/project scope, cross-project leakage |
| Sem Neo4j, sem Graphiti, sem PKM pronto, sem CRDT | "Do not build now": Neo4j, Graphiti, custom vector DB, multi-agent |
| Grafo com foco, não canvas com tudo | 05: "Focus Graph = default. Global Graph = advanced. Evitar canvas com tudo" |
| Índice derivado, reconstruível a partir do Git | "Derived indexes devem ser reconstruíveis" |
| Fonte bruta nunca descartada | Provenance obrigatório + Source Inspector |
| Vercel + Supabase free enquanto for protótipo | Filosofia: "Vercel desde o início", "cada fase entrega software publicado" |

Também confirma o que **já está no ar**: https://feel-cerebro.vercel.app,
o app Next.js 16 com login por magic link, captura (colar/upload), lista de
inbox e promoção com Octokit; as migrations `0001_init.sql` (6 tabelas +
RLS) e `0002_storage.sql`.

---

## 2. O que temos que o kit não tem

Nem tudo é o kit ensinando. Três coisas nossas não existem lá e valem ser
mantidas:

**Eixos.** O kit tem Project e Objective, mas nada como os eixos/frentes da
Feel. Nosso `eixos` (tabela vazia por design, esperando a sessão de
convergência dos três) é uma camada de organização territorial que o kit
não previu — e é exatamente ela que sustenta a visão do mapa imersivo que
os fundadores descreveram.

**Estado epistêmico como campo, não como tipo.** O kit transforma
`Hypothesis` e `Evidence` em *tipos* de objeto. Nós separamos: o objeto tem
um `tipo`, e separadamente carrega `epistemico`
(fato/evidência/decisão/hipótese/inferência/opinião) e `confianca`. Isso é
mais expressivo, não menos: no kit, uma Decision não pode ser marcada como
"decidida sobre inferência fraca"; no nosso, pode. Manter.

**Autoria de três fundadores como cidadã de primeira classe.** O kit tem
`organization_members` e roles, mas o objetivo declarado dele é continuidade
individual/agente. O nosso existe para *cruzar três cabeças* — e é por isso
que `autor_id` é obrigatório em toda escrita e que "a Gabrielle e o Axel
chegaram na mesma conclusão por caminhos diferentes" é uma consulta que o
schema consegue responder.

---

## 3. As lacunas reais, ranqueadas

Ordenadas por quanto custa não ter.

**1. Não existe camada de orientação. Nenhuma.**
O kit é enfático na Fase 01: *"A primeira versão funcional não pode ser
apenas login/sidebar. Precisa entregar orientação real: project, objective,
NOW, NEXT, NOT NOW, Quick Capture."* Nós temos captura e promoção — a parte
profunda — e zero da parte que responde "onde estamos e o que fazer agora".
Não existe `project_state`, não existe NOW, não existe NEXT, não existe
NOT NOW. Essa é a maior lacuna do sistema, e é a que mais dói porque é a
que gera valor no primeiro dia de uso.

**2. Não existe multi-tenancy.** Sem `organizations`, sem `projects`, sem
`organization_members`. Nosso `escopo` (`pessoal|feel|cliente:<nome>`) é um
substituto pobre de tenancy real, imposto por RLS mas sem estrutura.
Retrofit disso depois é a migração mais dolorosa do plano inteiro.

**3. Não existe Event Log.** O kit usa `events` (append-only, não event
sourcing) como base de "What Changed", de Recent Changes e depois do Resume
inteiro. Sem isso, a Fase 02 (continuidade) não tem de onde tirar dado.

**4. Não existe Source Registry.** Temos `arquivos_raw`, que é uma fatia
estreita: um provider só (upload gerenciado). O kit quer saber, de qualquer
fonte: o que existe, onde existe, quem é autoridade, qual versão, quem pode
acessar, como se relaciona, quando entra no contexto.

**5. Não existe Checkpoint nem Resume.** Toda a Fase 02 do kit —
continuity checkpoint, last seen, resume determinístico, What Changed,
Needs Attention — não tem nenhum equivalente nosso.

**6. `notas_promovidas` mistura canônico com derivado.** Esta é a descoberta
mais técnica do cruzamento, e é real: o kit exige que o índice seja
**reconstruível a partir do Git sozinho**. Nossa tabela tem `caminho_arquivo`
e `commit_sha` (bom), mas também tem `autor_id` e `item_inbox_origem_id`,
que **não estão no frontmatter do Markdown**. Se apagarmos a tabela e
reindexarmos o repositório, perdemos esses dois campos para sempre. Ou
esses campos entram no frontmatter, ou a tabela precisa ser dividida em
"registro de promoção" (operacional) e "índice de conhecimento" (derivado).
Correção barata agora, cara depois.

**7. `relacoes` não distingue origem.** O kit exige `origin`
(explicit / structural / semantic / inferred) e `status`. Temos
`proposta_por` + `confirmada`, que cobre "quem propôs" mas não "que tipo de
evidência gerou essa aresta". Migração pequena.

**8. Faltam, por fase e sem urgência agora:** Context Packs (06), Run Cards
(07), `ai_runs` (04+), Signals (09), Spec como tipo canônico (03), pipeline
de embeddings (04, a coluna `vetor` já está reservada).

---

## 4. Os quatro conflitos que exigem decisão explícita

O kit proíbe reabrir arquitetura sem contradição técnica comprovada. Estes
quatro pontos não são contradições — são bifurcações onde ele e nós fizemos
escolhas diferentes, e escolher em silêncio seria exatamente o erro que
este projeto existe para evitar.

### 4.1 — Estamos construindo um produto ou uma ferramenta interna?

O kit descreve o **Project OS** como produto: multi-projeto, multi-org,
`/projects`, dogfood no próprio Project OS. O Cérebro da Feel é
single-tenant: um cérebro, três pessoas.

**Recomendação: adotar a forma multi-projeto desde já, com "Feel" como o
primeiro projeto dentro dela.** Não por ambição de virar produto — por
custo de migração. É exatamente o mesmo raciocínio que já aplicamos ao
`eixo_id` ("existe desde o primeiro registro mesmo antes de a lista de
eixos existir, porque criar depois exigiria migrar toda nota já
promovida"). Tenancy é essa mesma decisão, uma ordem de grandeza mais
cara. Custa pouco hoje: três tabelas e uma coluna `project_id` nas que já
existem. Custa caro depois: reescrever toda policy de RLS com dados
reais dentro.

### 4.2 — Qual vocabulário canônico vale?

| Kit | Nosso | Leitura |
|---|---|---|
| Decision | `decision` | idêntico |
| Question | `open-loop` | idêntico em função (fio que não fechou) |
| Hypothesis | `epistemico: hipotese` | ele tipa o objeto, nós marcamos o estado |
| Evidence | `epistemico: evidencia` | mesma coisa |
| Spec | — | **não temos** |
| — | `reasoning` | sem equivalente direto |
| — | `insight` | sem equivalente direto |
| — | `source` | redundante: vira Source Registry |
| — | `project-state` | redundante: vira tabela `project_state` |

**Recomendação:** adotar os cinco tipos do kit (Decision, Hypothesis,
Evidence, Question, Spec), **manter** `epistemico` e `confianca` como campos
ortogonais (são mais expressivos que o `confidence` do kit), e aposentar
`source` e `project-state` como tipos de nota — eles viram, respectivamente,
o Source Registry e a tabela de estado. `reasoning` e `insight` mapeiam para
Evidence ou Hypothesis conforme o estado epistêmico.

Custo honesto disso: o vault pessoal do Gabriel usa
`decision/reasoning/insight/open-loop` e tem 33 notas reais nesse
vocabulário. Adotar o do kit **diverge** do vault pessoal. Isso é
permitido — o `CEREBRO-DA-FEEL.md` §2 já estabelece que os dois sistemas
são separados e que um não herda as restrições do outro — mas é uma
divergência real, não um detalhe.

### 4.3 — Construímos a Fase 03 antes da 01

Fato, sem rodeio: o que está no ar hoje (captura → candidato → promoção →
commit no Git) é a **Fase 03** do kit. As Fases 01 e 02 — fundação,
orientação, continuidade — não existem. Construímos a parte profunda e
pulamos a parte que entrega valor no primeiro uso.

Isso não invalida nada do que foi feito. O código de promoção, o Octokit, a
geração de id humano-legível, o schema de `itens_inbox`: tudo isso é a Fase
03 já ~70% escrita, esperando o repositório existir. Mas significa que a
ordem correta de retomada não é "terminar o que começamos" — é **voltar e
construir a fundação que faltou**, e deixar a promoção esperando o GitHub.

### 4.4 — Eixos não existem no kit

Nossa extensão. Recomendação: mantê-la, com os eixos passando a ser
**por projeto** (`eixos.project_id`), e o mapa territorial que os fundadores
imaginaram deixando de ser "nossa Fase 2" para virar parte da **Fase 05
(Trace & Explore)** do kit — que é exatamente onde o Focus Graph mora. O
portão que já tínhamos (não construir o mapa antes dos eixos existirem)
continua valendo, e agora ganha um segundo portão do próprio kit: Fase 05
exige corpus canônico, provenance e vocabulário de relações congelado.

Bônus: o renderer de canvas 2D do `cerebro-ui` (vault pessoal) — grafo
padrão, rótulos com desvio de colisão, estabilidade espacial persistida,
paleta verificada contra daltonismo — é um ativo reaproveitável nessa fase.
O kit sugere React Flow; temos algo próprio já testado que resolve o mesmo
problema com mais controle.

---

## 5. A descoberta operacional mais útil do cruzamento

**As Fases 01 e 02 do kit não precisam do GitHub.**

Nosso bloqueio atual é duplo: falta o repositório/token do GitHub e falta
uma organização Supabase. O GitHub bloqueia a promoção — que é Fase 03.

Mas Project State, NOW, NEXT, NOT NOW, Quick Capture, Events, Checkpoints,
Resume determinístico, What Changed, Needs Attention: **tudo isso precisa
só de Postgres.** Ou seja, a ordem do kit contorna nosso bloqueio em vez de
esbarrar nele. No momento em que existir um projeto Supabase, dá para
entregar a camada que hoje falta — e que é justamente a de maior valor
percebido — sem depender de nada do GitHub.

Isso reorganiza o caminho crítico inteiro. A pergunta deixa de ser "quando
o Gabriel cria o repo" e passa a ser "quando existe o banco".

---

## 6. Delta de dados

| Tabela | Existe hoje? | O que muda | Fase |
|---|---|---|---|
| `organizations` | não | criar | 01 |
| `organization_members` | não | criar (roles: owner/builder/viewer) | 01 |
| `projects` | não | criar | 01 |
| `pessoas` | sim | vira `profiles`; ganha vínculo com members | 01 |
| `project_state` | não | criar (objective, NOW, NEXT ≤ 3, NOT NOW) | 01 |
| `events` | não | criar (append-only) | 01 |
| `itens_inbox` | sim | ganha `project_id`; passa a ser o `candidates` do kit | 01 |
| `arquivos_raw` | sim | mantém; vira um adapter do Source Registry | 01→03 |
| `checkpoints` | não | criar | 02 |
| `sources` (Source Registry) | não | criar | 03 |
| `notas_promovidas` | sim | resolver a mistura canônico/derivado (§3.6); tipos novos (§4.2); `project_id` | 03 |
| `knowledge_index` | não | separar de `notas_promovidas`, ou tornar o frontmatter completo | 03 |
| `eixos` | sim | ganha `project_id` | 01 |
| `relacoes` | sim | ganha `origin` e `status` | 03→05 |
| `ai_runs` | não | criar quando a IA entrar | 04 |
| `context_packs` / `context_pack_items` | não | criar | 06 |
| `run_cards` | não | criar | 07 |
| `signals` | não | criar | 09 |

---

## 7. Plano de fases reconciliado

| Fase | Conteúdo | Precisa de GitHub? | Aproveita o que já temos |
|---|---|---|---|
| **01 Live Foundation** | orgs/projects/members, `project_state`, NOW/NEXT/NOT NOW, Quick Capture, Events, RLS, deploy | **não** | app Next.js no ar, auth por magic link, UI de captura, `itens_inbox`, RLS já escrita |
| **02 Continuity Core** | checkpoints, Resume determinístico, What Changed, Needs Attention | **não** | Events da 01 |
| **03 Federated Memory** | Source Registry, GitHub App, Markdown canônico versionado, Candidate review, `knowledge_index` reconstruível | sim | **`/api/promote`, Octokit, geração de id, `notas_promovidas` — já escritos** |
| **04 Retrieval & Ask** | FTS, chunks, pgvector, hybrid, Ask com citações, resposta negativa | não | coluna `vetor` já reservada |
| **05 Trace & Explore** | `relation_index`, Focus Graph, Source Inspector — **e aqui entra o mapa dos eixos** | não | `relacoes`, renderer de canvas do `cerebro-ui` |
| **06 Context Engineering** | Context Packs, constrained Ask | não | — |
| **07 Execution Intelligence** | WORK, GitHub/Vercel adapters, Run Cards | sim | — |
| **08 Agent Continuity** | Context Compiler, context.md/JSON, decisão sobre MCP | não | — |
| **09 Signals & Hardening** | sinais determinísticos, reconciliação, segurança, métricas | não | cron de keepalive já existe |
| **99 Final Audit** | auditoria adversarial do V1 | — | — |

Ordem de ataque imediata: **01 → 02** (só Supabase, valor alto, desbloqueia
dogfood real) e **03 assim que o repositório existir** (o código já está
quase pronto e fica esperando).

---

## 8. O que não muda

Preservado integralmente, porque o kit confirma em vez de contradizer:

- Vercel na conta pessoal gratuita enquanto for protótipo interno, com o
  gatilho de revisão já registrado (`CEREBRO-DA-FEEL.md` §3).
- Supabase free, com o cron semanal de keepalive contra a pausa.
- Promoção deliberada, nunca automática.
- Fonte bruta preservada.
- Nada sobrescrito em silêncio.
- O mapa territorial continua atrás do portão dos eixos definidos.
- MarkItDown e SemHash continuam adotados; Decap CMS, PKMs prontos, CRDT e
  banco de grafo continuam descartados — e agora com o reforço da lista
  "Do not build now" do kit, que descarta os mesmos.

---

## 9. Três decisões que são de vocês, não minhas

Registradas aqui para não serem tomadas em silêncio. Sigo com as
recomendações como padrão se ninguém discordar.

1. **Multi-projeto desde já, com Feel dentro?** Recomendo sim (§4.1).
2. **Adotar Decision/Hypothesis/Evidence/Question/Spec, mantendo
   `epistemico` e `confianca`?** Recomendo sim, sabendo que diverge do vault
   pessoal do Gabriel (§4.2).
3. **O nome do que estamos construindo** — continua "Cérebro da Feel", ou o
   sistema é um Project OS com a Feel como primeiro projeto? Isso muda como
   os documentos falam de si mesmos, não muda uma linha de código.

---

## 10. Próximo movimento concreto

Seguindo o protocolo do próprio kit, o passo seguinte a este documento é o
`00_IMPLEMENTATION_PLAN_FREEZE` — o Master Implementation Plan v1, com DAG
de capacidades, contratos de fase, evolução de banco e de rotas, e os
primeiros 40–60 movimentos concretos. Esse documento não escreve código;
ele congela o roadmap para que nenhuma rodada seguinte reinterprete a
arquitetura.

Depois dele, a Fase 01 começa — e ela só precisa de um projeto Supabase
para existir.

**Estado do gate desta rodada:**

```
INSPECT:                 PASS
RECONCILE:               PASS
ARCHITECTURE REOPENED:   NO
ARCHITECTURE DEVIATION:  NENHUMA
DECISÕES PENDENTES:      3 (seção 9)
READY FOR PLAN FREEZE:   YES
```
