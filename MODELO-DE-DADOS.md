# Modelo de dados — Cérebro da Feel

> Documento de especificação, não de implementação. Nenhuma tabela aqui é uma
> migration pronta para rodar — é o desenho que os três fundadores revisam
> antes de existir código. Pressupõe as decisões já tomadas na conversa que
> originou este documento: Vercel + Supabase + GitHub, projetos novos e
> separados do repo Ecossistema Feel, fronteira Git/Postgres por frequência
> de escrita, captura pela própria UI.

---

## 1. Princípios do modelo

Afirmações que travam decisão — não sugestões, e não reabertas sem evidência
nova, pelo mesmo motivo que o vault pessoal do Gabriel trava as suas:

1. **Todo registro, em qualquer tabela, tem id estável desde a criação.**
   Nunca reciclado, nunca renumerado. É o que permite uma nota promovida
   apontar para o item de inbox que a originou para sempre.
2. **Toda escrita carrega autoria explícita** — uma das três pessoas, ou
   `sistema` quando for um processo automático (indexador, curador). Nunca
   autoria implícita ou ausente. Sem isso, "a Gabrielle e o Axel chegaram na
   mesma conclusão por caminhos diferentes" nunca é uma frase que o sistema
   consegue provar.
3. **Nenhum campo de classificação é obrigatório na captura.** `eixo`,
   `epistemico`, `confianca` existem no schema desde o primeiro dia, todos
   aceitando nulo. Captura tem que ser mais rápida que a vontade de não
   capturar; classificar é trabalho de promoção, não de entrada.
4. **A direção de promoção é única e não se inverte:** inbox (Postgres) →
   conhecimento (Git). Nada escreve de volta do Git para o inbox. A leitura
   do Git para a UI é sempre via projeção recalculada, nunca editada à mão
   no banco.
5. **A fonte bruta nunca é descartada enquanto a nota que ela originou
   existir.** O PDF, o DOCX, o texto colado — tudo isso é o "RAW" da tríade
   `RAW → EXTRAÍDO → CONSOLIDADO` que já vale no vault pessoal do Gabriel.
6. **Relação entre notas é sempre tipada e tem proponente.** Uma relação que
   o curador (IA) propôs não é verdade até um humano confirmar — é a mesma
   regra de "captura automática, promoção seletiva", aplicada a arestas, não
   só a nós.
7. **Nada é sobrescrito em silêncio.** Mudança de estado move o campo
   `status`; não apaga a linha.
8. **Escopo é imposto pelo banco (RLS), não por convenção de código.** Se um
   dia entrar `escopo: cliente:<nome>`, o isolamento não pode depender de
   toda function lembrar de filtrar certo.

---

## 2. Tabelas

Convenção: todo id é `uuid` gerado no banco (`gen_random_uuid()`), exceto
`notas_promovidas.id`, que é um id humano-legível (ver a tabela). Todo
timestamp é `timestamptz`. Campo marcado **(agora)** não pode ser adiado sem
retrofit doloroso depois; **(depois)** pode nascer vazio e ser preenchido
quando fizer sentido.

### `pessoas`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid, pk | Id estável da pessoa. |
| `auth_user_id` | uuid, fk → `auth.users` | Liga a pessoa ao login do Supabase Auth. **(agora)** — sem isso, autoria (princípio 2) não existe. |
| `nome` | text | Nome de exibição. |
| `email` | text | Usado pelo magic link. |
| `papel` | text | `fundador` para os três iniciais; espaço para `colaborador` depois — **(depois)**, sem valor default forçado. |
| `criado_em` | timestamptz | — |

Por que existe agora: é a base de tudo que depende de "quem fez isso" —
ou seja, quase todo o resto do modelo.

### `arquivos_raw`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid, pk | — |
| `storage_path` | text | Caminho no bucket do Supabase Storage. |
| `nome_original` | text | Nome do arquivo como o usuário enviou. |
| `mime_type` | text | Para decidir extrator (PDF vs DOCX vs texto). |
| `tamanho_bytes` | bigint | Para vigiar o limite de 1 GB do plano free antes de estourar. |
| `enviado_por` | uuid, fk → `pessoas` | **(agora)** — autoria. |
| `enviado_em` | timestamptz | — |

Por que existe agora: separa o arquivo bruto do registro de inbox desde o
início, para que "a fonte nunca é descartada" (princípio 5) não dependa de
ninguém lembrar de fazer isso depois.

### `itens_inbox`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid, pk | Id estável — sobrevive à promoção. |
| `autor_id` | uuid, fk → `pessoas` | **(agora)**. |
| `tipo_origem` | text | `colado` \| `upload_pdf` \| `upload_docx` \| `upload_markdown` \| `upload_txt`. |
| `arquivo_raw_id` | uuid, fk → `arquivos_raw`, nullable | Nulo quando `tipo_origem = colado`. |
| `texto_bruto` | text, nullable | Preenchido na hora para texto colado; preenchido depois da extração para upload. |
| `titulo_sugerido` | text, nullable | Heurística simples (primeira linha não vazia) — nunca decide sozinho, só sugere na tela de promoção. |
| `status` | text | `novo` → `em_extracao` (só uploads) → `pronto_para_revisao` → `promovido` \| `descartado`. |
| `nota_promovida_id` | text, fk → `notas_promovidas.id`, nullable | Preenchido no momento da promoção. |
| `criado_em` | timestamptz | — |
| `promovido_em` | timestamptz, nullable | — |

Por que existe agora: é a porta de entrada inteira do sistema — sem ela não
há captura de baixa fricção, que era o requisito que motivou abandonar a
regra "só leitura" do vault pessoal.

### `eixos`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid, pk | — |
| `nome` | text, nullable | **(depois)** — a tabela existe vazia até a sessão de convergência definir os eixos de verdade. Ver `docs/PLANO-CEREBRO.md`-equivalente do Cérebro da Feel, seção de eixos. |
| `descricao` | text, nullable | — |
| `cor` | text, nullable | Para o mapa — **(depois)**, junto com o desenho visual. |
| `ordem` | integer, nullable | Para o mapa — **(depois)**. |
| `ativo` | boolean, default true | Um eixo descontinuado desativa, não apaga (princípio 7) — notas antigas continuam apontando pra ele. |
| `criado_em` | timestamptz | — |

Por que a tabela existe agora mesmo vazia: `notas_promovidas.eixo_id`
(abaixo) precisa de algo para apontar desde o primeiro registro, mesmo que
nulo. Criar a tabela depois exigiria migrar toda nota já promovida.

### `notas_promovidas`

O espelho no Postgres de cada nota que existe em Markdown no Git.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | text, pk | Id humano-legível, gerado na promoção — `DEC-001`, `RT-001`, `INS-001`, `OL-001`, no mesmo vocabulário do `SCHEMA.md` do vault pessoal. **Não é uuid** deliberadamente: aparece em conversa, em commit message, em link — precisa ser pronunciável. |
| `tipo` | text | `decision` \| `reasoning` \| `insight` \| `open-loop` \| `source` \| `project-state`. |
| `titulo` | text | — |
| `eixo_id` | uuid, fk → `eixos`, nullable | **(agora, nullable)** — o campo existe já; o valor pode chegar depois. |
| `escopo` | text | `pessoal` \| `feel` \| `cliente:<nome>` — usado pelo RLS (princípio 8). |
| `status` | text | `ativa` \| `superseded` \| `resolvida` \| `dormente`. |
| `epistemico` | text, nullable | `fato` \| `evidencia` \| `decisao` \| `hipotese` \| `inferencia` \| `opiniao`. |
| `confianca` | text, nullable | `baixa` \| `media` \| `alta`. |
| `autor_id` | uuid, fk → `pessoas` | Quem promoveu — pode ser diferente de quem capturou (`itens_inbox.autor_id`). |
| `item_inbox_origem_id` | uuid, fk → `itens_inbox`, nullable | Rastreabilidade RAW → CONSOLIDADO; nulo só para notas migradas de fora do fluxo normal. |
| `caminho_arquivo` | text | Path relativo no repositório Git, ex.: `04-memoria/decisoes/dec-001-x.md`. |
| `commit_sha` | text | Hash do commit mais recente que tocou este arquivo. |
| `vetor` | vector, nullable | Coluna reservada para pgvector. **(depois)** — sem índice, sem preenchimento, até a busca por similaridade ser implementada. Existe agora só para não exigir migração de tabela quando chegar a hora. |
| `criado_em` / `atualizado_em` | timestamptz | — |

### `relacoes`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid, pk | — |
| `origem_id` | text, fk → `notas_promovidas.id` | — |
| `destino_id` | text, fk → `notas_promovidas.id` | — |
| `tipo` | text | `supports` \| `contradicts` \| `derived_from` \| `depends_on` \| `supersedes` \| `related`. |
| `proposta_por` | uuid, fk → `pessoas`, nullable | Nulo = proposta pelo curador automático (princípio 6). |
| `confirmada` | boolean, default false | Vira `true` só por ação humana explícita. |
| `confirmada_por` | uuid, fk → `pessoas`, nullable | — |
| `criado_em` | timestamptz | — |

### Esqueleto reservado — não implementar agora, só provar que encaixa

Estas três tabelas existem neste documento apenas para demonstrar que a
"camada de ligação" entre memória e operação é uma foreign key simples, não
uma reformulação de arquitetura quando a Feel decidir construir gestão de
projeto e calendário.

**`iniciativas`** — `id`, `titulo`, `nota_origem_id` (fk `notas_promovidas`,
nullable), `eixo_id`, `status`, `criado_em`.

**`responsaveis_iniciativa`** — `iniciativa_id`, `pessoa_id`, `papel`
(tabela de junção).

**`eventos`** — `id`, `titulo`, `data_inicio`, `data_fim`, `iniciativa_id`
(nullable), `nota_relacionada_id` (nullable, fk `notas_promovidas`).

Nenhuma dessas três entra na primeira migration.

---

## 3. O caminho de um documento

Do gesto do usuário até a nota consolidada, com a peça de infraestrutura que
executa cada seta.

1. **Captura.** Usuário cola texto ou arrasta um arquivo na UI (Next.js na
   Vercel).
   - Texto colado: um `insert` direto em `itens_inbox`, `texto_bruto`
     preenchido na hora, `status = pronto_para_revisao`. Sem passo
     intermediário — é o caso mais barato e deve continuar sendo.
   - Upload: o arquivo sobe **direto do navegador para o Supabase Storage**
     via signed URL, sem passar pela function da Vercel — evita o timeout e
     o limite de payload de uma Function ao lidar com um PDF grande.
     Depois do upload: registro em `arquivos_raw`, registro em
     `itens_inbox` com `status = em_extracao`.
2. **Extração** (só para upload). Uma Function da Vercel, disparada logo
   após o upload confirmar, baixa o arquivo do Storage, roda o extrator de
   texto adequado ao `mime_type` (`pdf-parse` para PDF, `mammoth` para
   DOCX), grava o resultado em `itens_inbox.texto_bruto`, muda
   `status = pronto_para_revisao`. Falha de extração não trava o item — ele
   fica com `texto_bruto` nulo e aparece marcado para revisão manual, nunca
   silenciosamente perdido.
3. **Revisão coletiva.** O item aparece na lista de inbox para os três — por
   desenho, não é uma caixa de entrada privada; o objetivo declarado é
   cruzar os três inputs, então visibilidade compartilhada desde a captura é
   o padrão (ver pergunta em aberto sobre rascunho privado, seção 5).
4. **Promoção.** Um dos três abre o item, preenche o que for preenchível
   (`tipo`, `eixo` se já souber, `escopo`, `epistemico`, `confianca`), aciona
   "promover". Uma Function da Vercel:
   - gera o `id` humano-legível (consulta o último id da sequência do tipo
     no Postgres, ex.: próximo `DEC-00N`);
   - monta o arquivo Markdown com frontmatter no mesmo formato do
     `SCHEMA.md`;
   - chama a API do GitHub (autenticada via GitHub App ou token de escopo
     restrito ao repositório) para criar/atualizar o arquivo e commitar;
   - grava a linha em `notas_promovidas` com o `commit_sha` retornado;
   - atualiza `itens_inbox.status = promovido` e `nota_promovida_id`.
5. **Reindexação.** O push no GitHub dispara um webhook para uma Function da
   Vercel, que roda o indexador (evolução do `cerebro-index.mjs` do vault
   pessoal — mesma lógica de parsing de frontmatter e grafo, destino
   diferente) e atualiza a projeção de leitura que a UI consome.
6. **Manutenção periódica.** Um cron da Vercel, semanal:
   - faz uma leitura trivial no Supabase para evitar a pausa por
     inatividade do plano free;
   - roda o curador — busca por similaridade via `vetor` (quando essa etapa
     existir) mais um julgamento por LLM sobre a lista curta de pares
     parecidos — e grava propostas em `relacoes` com `confirmada = false`,
     para os três revisarem no ritmo deles.

---

## 4. O que fica deliberadamente fora deste documento

- **Telas, layout e paleta do grafo** — isso é o `cerebro-ui` evoluindo, não
  o modelo de dados. O modelo só garante que os campos que a UI vai precisar
  já existem.
- **Implementação de embeddings** — a coluna `vetor` existe reservada; o
  pipeline que a preenche, o índice (`ivfflat`/`hnsw`) e o curador que a usa
  são um passo posterior, só depois que houver volume suficiente para
  justificar (hoje, "dezenas de itens", uma varredura completa por
  similaridade textual simples já resolveria sem pgvector).
- **Definição dos eixos de verdade** — é o produto da sessão de convergência
  dos três, não uma decisão de modelagem. Este documento só garante que a
  tabela e a coluna existem para receber o resultado dessa sessão sem
  retrofit.
- **Migration SQL executável** — as tabelas acima são especificação; a
  migration versionada (`supabase/migrations/`) é o próximo passo, depois de
  revisão.

---

## 5. Perguntas em aberto para os três decidirem

Pontos em que uma decisão foi necessária para o documento fechar, e que
merecem confirmação explícita antes da implementação:

1. **Nome do repositório e dos projetos.** Sugestão: `feel-cerebro` nas três
   plataformas (GitHub, Vercel, Supabase) — sem acento, sem espaço. Não
   decidido, só sugerido.
2. **Promoção commita direto na branch principal, ou abre PR?** Direto é
   mais simples e coerente com "captura automática, promoção seletiva" (a
   seleção já aconteceu no ato de promover); PR adiciona uma revisão a mais
   antes do commit valer. Afeta a permissão do token/GitHub App.
3. **Extração de arquivo grande: síncrona na Function ou fila?** Assumido
   síncrono neste documento, dado o volume declarado ("dezenas de itens").
   Se algum PDF for muito grande (dezenas de MB, centenas de páginas), o
   timeout da Function pode não bastar — vale um teste com um arquivo real
   antes de confiar nisso.
4. **Promoção exige confirmação de mais de uma pessoa, ou qualquer um dos
   três promove sozinho?** Este documento assume promoção individual — é o
   modelo mais simples e compatível com "captura é automática, promoção é
   seletiva" já valer para uma pessoa. Dois fundadores discordando de uma
   promoção viram uma relação `contradicts` proposta depois, não um bloqueio
   antes.
5. **O inbox é sempre visível aos três, ou existe um estado de rascunho
   privado antes de "publicar" para o time?** Este documento assume
   visibilidade total desde a captura (é o que serve ao objetivo de cruzar
   os três inputs). Se algum dos três quiser um espaço de rascunho pessoal
   antes de expor, isso é um campo (`visibilidade`) e uma regra de RLS a
   mais — hoje ausente por decisão implícita, não testada com os três.
6. **Retenção do arquivo RAW original.** O Storage free do Supabase tem 1 GB.
   Este documento assume retenção indefinida (princípio 5). Se o volume de
   upload crescer rápido, vale decidir uma política de arquivamento antes de
   estourar o limite — não antes disso.

---

Relacionado: a conversa que originou este documento (arquitetura Vercel +
Supabase + GitHub, fronteira Git/Postgres, captura pela UI). Schema de
classes e campos herdado de `SCHEMA.md` do vault pessoal do Gabriel, adaptado
aqui para um contexto multiusuário com Postgres como camada operacional.
