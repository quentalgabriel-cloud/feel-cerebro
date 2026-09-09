# Estado real — 2026-09-09

Fatos verificados com ferramenta na sessão que escreveu este arquivo, não
intenções. Onde algo é suposição, está dito. **Se este arquivo contradiz o
que você deduziria lendo o código, ele está certo até você verificar o
contrário com uma ferramenta — e aí corrija o arquivo na mesma entrega.**

Substitui a versão de 2026-09-02, que descrevia um sistema com 5 migrations
e nenhuma ponte para o Git.

---

## 1. O número que importa mais que todos os outros

O sistema está **construído e praticamente não usado**.

| | |
|---|---|
| Conhecimento indexado | **55 itens** (15 com tipo inferido pela pasta) |
| Arquivos subidos pelo upload | **0** |
| Fontes registradas (`sources`) | **0** |
| Capturas (`candidates`) | **1** |
| Promoções | **1** (a de teste, que virou commit real no Git) |
| Itens de estado (NOW/NEXT) | **0** |
| Eventos | **0** |
| Projetos | 2 (`cerebro`, `feel`) |

Os 55 itens **não entraram pelo upload**. Entraram pelo `reindex`, lendo o
vault de Markdown que já existia no Git. A ponte PC → web foi construída,
testada e **nunca atravessada**. A parte "Project OS" — NOW/NEXT, eventos,
o ciclo de orientação — está com zero linhas.

Isso não é um detalhe de adoção; é o dado que deve governar a priorização.
Construir a próxima peça antes de a anterior ser usada é como o projeto
chega a dez peças e zero valor. Ver §7.

---

## 2. Infraestrutura

| Peça | Estado | Identificadores |
|---|---|---|
| **Supabase** | ativo | `feel-cerebro` (`rvctaywzzipimrpjfkqi`), `sa-east-1`, Postgres 17.6, `https://rvctaywzzipimrpjfkqi.supabase.co` |
| **Vercel** | deploy contínuo por Git funcionando | `feel-cerebro` (`prj_hGJNBOrBMLIABHAbi0uo1CA1Gstx`), conta `gquental` (`team_2sjFcoePiJ8zbmnwDwxRD3mu`), plano Hobby, https://feel-cerebro.vercel.app |
| **GitHub — código** | **público**, 23 commits em `main` | https://github.com/quentalgabriel-cloud/feel-cerebro |
| **GitHub — conhecimento** | **privados**, deliberadamente | `quentalgabriel-cloud/cerebro` · `quentalgabriel-cloud/ecossistema-feel` |

O Root Directory da Vercel é `app` — sem isso o build roda da raiz e o alias
`@/*` não resolve. Já está configurado; não mexa.

**Duas autorizações explícitas do Gabriel governam a infra**, e valem até ele
dizer o contrário:

1. **Conta pessoal gratuita na Vercel**, não team Pro — *"ainda não vou
   colocar o projeto na rua como produto"*. Gatilho de revisão: deixar de ser
   protótipo interno.
2. **Repositório de código público** (2026-09-02) — levantei o risco de a
   estratégia dos três sócios ficar exposta e ele autorizou seguir assim.
   Por isso os **dois repositórios de conhecimento são privados**: eles
   guardam decisão e estratégia, não código. A consequência mais importante
   do público é que **segredo commitado é segredo vazado** — a resposta passa
   a ser rotacionar a credencial, nunca apagar o commit.

---

## 3. Banco

11 migrations aplicadas em produção, RLS ativa em todas as tabelas.

```
0001_foundation          profiles · organizations · organization_members ·
                         projects · project_state · state_items · events ·
                         raw_files · candidates · axes
0002_storage             bucket raw-files            (policy errada — ver 0010)
0003_harden_functions    correção parcial            (ver 02-APRENDIZADOS §2)
0004_private_schema      a correção certa
0005_org_bootstrap       primeira organização sem service role
0006_knowledge_bridge    sources · knowledge_index · knowledge_counters
0007_knowledge_search    coluna `busca` gerada (tsvector português)
0008_promotions          fila de promoção
0009_reservar_display_id porta pública da sequência  (ver 0011)
0010_storage_por_projeto tenancy no bucket           (fechou vazamento real)
0011_rpc_sem_definer     o RPC deixa de ser SECURITY DEFINER
```

**Advisors de segurança:** só resta `auth_leaked_password_protection`, que é
um toggle de painel (Authentication → Policies) e depende do Gabriel.

Regras impostas **pelo banco**, não pela aplicação: índice único parcial
garante NOW = 1, check constraint garante NEXT ≤ 3, ausência de policy de
`update`/`delete` no bucket garante que fonte bruta nunca é alterada nem
descartada. A aplicação valida antes só para dar mensagem decente.

**Três invariantes de superfície** vivem na seção 9 de
`supabase/tests/rls_test.sql` e varrem o catálogo inteiro a cada execução:

| | invariante |
|---|---|
| a | nenhuma função de `public` é executável por `anon` |
| b | nenhuma função de `public` é `SECURITY DEFINER` |
| c | toda função de `public`/`private` tem `search_path` preso |

Se você adicionar função em `public`, ela vai nascer executável por `anon`
(default do PostgreSQL, ver `02-APRENDIZADOS §2b`) e o teste vai quebrar.
Isso é o comportamento desejado: escreva o `revoke ... from anon` explícito.

---

## 4. App

Fase 01 completa e no ar, mais a ponte de conhecimento inteira.

- **Login** por email+senha (`signInWithPassword`). Sem autocadastro público
  por decisão — contas são provisionadas à mão. ADR-0006 explica o porquê.
- **Tenancy** por organização, com bootstrap idempotente.
- **NOW / NEXT / NOT NOW**, Quick Capture (⌘K), "o que mudou" a partir de
  `events`, empty states honestos.
- **MEMORY** com duas zonas separadas de propósito: *Conhecimento* (o que já
  foi decidido, projeção do Git) e *Captura* (o que entrou e ainda não foi
  decidido). Busca por FTS em português e filtro por tipo, ambos por URL.
- **Upload** do navegador direto para o Storage; a Server Action registra,
  nunca carrega o arquivo.

Scripts que rodam fora da web, onde as credenciais de Git legitimamente
existem:

- `app/scripts/reindex.mjs` — destrói e reconstrói `knowledge_index` a partir
  do Markdown. **Sem modo incremental, de propósito**: incremental esconde
  divergência, que é exatamente o que este script existe para detectar.
  Provado idempotente por md5 após reconstrução dupla.
- `app/scripts/promote.mjs` — o worker da fila. Ordem obrigatória: escreve o
  arquivo → commita → **empurra** → só então toca no banco. Se o push falhar,
  o banco continua dizendo "pendente" e a próxima execução refaz. O pior
  estado possível é fila parada; nunca um acervo afirmando ter promovido algo
  que não está no Git.

Verificação na última execução: `vitest` 43 testes ✅ · `tsc --noEmit` ✅ ·
`eslint` ✅ · `next build` ✅ · `supabase/tests/verify.sh` → `RLS TEST: PASS`
(0001..0011) ✅ · advisors ✅ (só o toggle de painel).

---

## 5. As quatro travessias da ponte (DEC-013)

Todas existem e todas foram exercitadas ao menos uma vez:

| travessia | mecanismo | provado por |
|---|---|---|
| local → GitHub | `git push` da máquina do Gabriel | 23 commits |
| GitHub → app | `reindex.mjs` | 55 itens; md5 idêntico em duas reconstruções |
| web → GitHub | fila `promotions` + `promote.mjs` | DEC-001 virou o commit `89756c9` |
| PC → web | upload do navegador → Storage → `raw_files`/`sources`/`candidates` | **nunca usado com arquivo real** |

**Modelo de autoridade, que não deve ser renegociado sem registro formal:**
Git é dono do conhecimento canônico; Postgres é dono de estado, rastro e
captura; Obsidian é interface, não um terceiro sistema. `knowledge_index` é
**derivado** — nenhuma coluna dele guarda informação que não exista no
Markdown, e a prova disso é poder apagá-lo e reconstruí-lo.

---

## 6. Decisões de processo em vigor

- **DEC-012** — a trava de aprovação manual por etapa foi suspensa a pedido
  do Gabriel, que assumiu o risco explicitamente. O campo de proveniência
  (`origem: gabriel-afirmou | ai-inferido`) **permaneceu**, por acordo: virou
  campo, não portão. Itens inferidos aparecem marcados na tela.
- **DEC-013** — a reconciliação descrita em §5.
- **DEC-006** — capturar é barato e automático; promover é caro e seletivo. É
  isso que dá valor ao acervo, e é a primeira coisa que se perde quando
  alguém decide "subir tudo de uma vez".

---

## 7. O que fazer agora — e por quê nesta ordem

Levantamento feito em 2026-09-09 na máquina do Gabriel (Windows):

| pasta | documentos |
|---|---|
| `C:\Cérebro` | 54 `.md` — **já 100% dentro**, foi de onde vieram os 55 |
| Área de Trabalho | 83 (67 md, 12 pdf) |
| `Documents` | 98 (97 md) |
| `Downloads` | 248 (170 md, 62 pdf) |

**~429 documentos fora do vault**: ~334 markdown (que o sistema já lê hoje,
sem precisar de nada novo) e ~74 PDFs (que precisam de extrator).

### NOW — triagem antes da ingestão

Não é o extrator de PDF, e não é subir os 429. Subir tudo transformaria a
fila de captura em lixão: boa parte desses markdown em `Downloads` é saída de
IA, README e cópia duplicada do que já está no vault. Uma fila de 400 itens
que ninguém revisa mata a DEC-006 na prática, e o valor do acervo com ela.

Primeiro checkpoint, **sem subir nada**: percorrer as três pastas, ler o
começo de cada arquivo, detectar duplicata do que já está indexado, e
devolver os 429 classificados em três baldes — *entra*, *talvez*, *ruído* —
com o motivo de cada um. Gabriel aprova numa passada só. Resultado
observável: um `.md` com a lista.

### NEXT, nesta ordem

1. **Ingestão em lote** do balde "entra". O upload atual é um arquivo por
   vez, inviável para 100+.
2. **Extrator de PDF/DOCX** (`scripts/extract.mjs`) — depois da triagem,
   porque só aí se sabe quantos dos 74 PDFs realmente importam.
3. **Ligar NOW/NEXT a trabalho real**, para o Project OS deixar de ser tela
   vazia. Não é engenharia; é uso.

### LATER

Registrar o desvio de arquitetura QMD vs. D-12/D-13; relações entre itens de
conhecimento; pgvector.

### Ignorar por enquanto

Os 15 itens com tipo "inferido". Estão marcados, não atrapalham, e confirmar
um a um agora é trabalho manual sem retorno.

---

## 8. Bloqueado em ação humana

Só um item, e é de 30 segundos: **ligar a proteção contra senhas vazadas** no
painel do Supabase (Authentication → Policies). É o último aviso de segurança
aberto.

Tudo que estava bloqueado na versão anterior deste arquivo foi resolvido:
magic link (trocado por senha), push para o GitHub (feito pela máquina do
Gabriel), deploy contínuo (Root Directory corrigido no painel) e o
repositório de conhecimento (existe, em dois repos privados).

O que **não** está resolvido e não é bloqueio de engenharia é o dogfood — ver
§1. Continua sendo o maior risco do projeto.
