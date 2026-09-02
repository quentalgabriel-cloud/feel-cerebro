# Prompt 03 — Federated Memory & Canonical Knowledge

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Dar ao Project OS uma camada real de **fontes, provenance e conhecimento durável**, sem centralizar fisicamente tudo.

Ao final:

Source → Candidate → Human Review → Canonical Markdown/Git → Index → Memory UI.

## Tese

> Conseguimos transformar inputs distribuídos em memória canônica auditável sem criar duas fontes de verdade?

## Pré-condições

- Phase 01/02 PASS.
- Source Registry schema final do planning conhecido.
- topology inicial do Knowledge Store definida.

## 1. Source Registry

Implementar como Core.

Campos mínimos conforme planning freeze:

- id
- project_id
- provider
- kind
- locator
- authority_class
- ingestion_mode
- source_version/hash
- source_updated_at
- sync_state
- metadata
- permission scope quando necessário

Adapters iniciais somente os aprovados.
Preferência:

- internal
- GitHub
- managed upload
- Git-backed knowledge

Não criar adapter universal abstrato demais.

## 2. GitHub App / Knowledge Store

Configurar GitHub App com permissões mínimas necessárias.

Knowledge Store configurável:

- repository
- branch
- root_path

Implementar leitura/escrita de conhecimento.
Não assumir necessariamente que code repo = knowledge repo.

Webhook:

- signature verification
- idempotency
- event persistence
- reconciliation path

## 3. Canonical Markdown Schema

Implementar schema versionado.

Tipos iniciais conforme planning:

- Decision
- Hypothesis
- Evidence
- Question
- Spec

Metadata mínima:

- id interno/estável ou display id
- type
- title
- status
- project
- confidence quando aplicável
- created_at
- updated_at
- valid_from/valid_to quando aplicável
- owner
- source_refs
- relations
- supersedes
- schema_version

Writer deve ser determinístico.
Parser deve validar malformed content.

## 4. Identity

Não usar filename como identidade única.

Ter:

- internal UUID
- human-readable display ID, ex. DEC-0021

Resolver geração sem corrida.

## 5. Candidate Review

Expandir Candidate:

- proposed_type
- proposed_title
- proposed_body
- proposed_metadata
- confidence
- status

Estados mínimos:
- pending
- rejected
- promoted

Edit é ação, não necessariamente estado.

Flow:

Quick Capture/source extraction
→ Candidate
→ Review
→ Edit/Reject/Promote

Promotion só conclui depois do write canônico no Git.

Se Git falhar:
Candidate continua pending/error, nunca promoted.

## 6. Knowledge Types UX

### Decision
Question/Context/Decision/Why/Alternatives/Evidence/Consequences/Status/Supersedes

### Hypothesis
Statement/Evidence for/Evidence against/Confidence/Invalidation criteria/Status

### Evidence
Claim/Source/Relevance/Strength

### Question
Open/Resolved/Closed + links

### Spec
estrutura compatível com processo de especificação; evitar duplicar Spec Kit. Se planning definiu integração, respeitar.

Progressive disclosure.
Não criar formulário gigantesco por default.

## 7. Memory UI

Views:

- All
- Decisions
- Hypotheses
- Evidence
- Questions
- Specs
- Candidates

Mostrar:
- canonical status
- source
- updated
- confidence
- provenance cues

## 8. Source Inspector V0

Mostrar:

- source identity
- provider
- authority
- version/hash
- locator
- metadata
- canonical objects derived from source
- open source action

## 9. Knowledge Index

Criar `knowledge_index` DERIVED.

Indexar após change/promotion.

Se apagado, deve poder reconstruir do Git.

Implementar rebuild/reindex command interno ou script administrativo.

## 10. Relations canônicas

Persistir relações explícitas no Markdown.
Projetar para relation_index se planning determinar introdução nesta fase; se relation UI for fase 05, pelo menos parse/serialize corretamente.

## 11. Provenance

Canonical object precisa rastrear:

- source_refs
- version/locator
- promotion event
- Git commit SHA

## 12. Local/Obsidian compatibility

Não criar plugin.

Garantir:
- Markdown limpo
- frontmatter padrão
- arquivos legíveis
- Git clone pode ser aberto em Obsidian

Se útil, documentar Git bridge manual simples.
Não transformar isso em subproduto.

## 13. Tests

Unit:
- Markdown parser/writer roundtrip
- schema validation
- display ID generation
- candidate transition

Integration:
- GitHub write
- webhook
- reindex
- idempotency

DB:
- RLS sources/candidates/index

E2E:
Quick Capture → Candidate → Promote Decision → Git Markdown exists → Memory shows it → reload.

Failure E2E:
Git write failure → Candidate not promoted.

## 14. Dogfood

Promover decisões arquiteturais reais do Project OS.
Criar pelo menos:
- 1 Decision
- 1 Hypothesis
- 1 Evidence
- 1 Question
- 1 Spec ou justificar se Spec ainda não entra

## Não implementar

- semantic retrieval
- Context Pack
- full Focus Graph UI
- GitHub PR execution intelligence
- multi-agent
- Graphiti

## Acceptance

- Source Registry funcional
- Knowledge Store real
- GitHub App secure
- Candidate review
- Markdown canonical
- parser/writer
- knowledge_index rebuildable
- Memory UI
- provenance
- dogfood canonical memory

## Gate

PHASE 03 RESULT
KNOWLEDGE AUTHORITY VERIFIED
GIT PROMOTION VERIFIED
REINDEX VERIFIED
PROVENANCE VERIFIED
READY FOR PHASE 04
