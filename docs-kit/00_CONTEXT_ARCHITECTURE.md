# Project OS — Contexto Arquitetural Congelado

## Definição

Project OS é um **continuity and reasoning control plane para projetos desenvolvidos com IA**.

Problema central:

> AI execution speed > human project comprehension speed.

Consequências que o produto combate:

- context debt;
- decision debt;
- state drift;
- documentation drift;
- perda de rationale;
- fragmentação de fontes;
- dificuldade de retomada;
- dificuldade de identificar o próximo passo correto.

## Core conceitual

### STATE
Onde estamos?

### MEMORY
O que sabemos, decidimos ou ainda investigamos?

### TRACE
Por que isso existe e de onde veio?

### CONTINUITY
Como continuar corretamente?

## UI oficial

A UI oficial é **web**, publicada no Vercel:

- NOW
- WORK
- MEMORY
- EXPLORE

Obsidian pode existir como cliente local opcional, nunca como UI principal.

## Princípios

1. Centralizar compreensão, não necessariamente armazenamento.
2. Uma entidade semântica possui uma única autoridade.
3. Source ≠ Candidate ≠ Canonical Knowledge ≠ Index ≠ Cache.
4. Current State ≠ History.
5. IA pode sugerir conhecimento; não pode promovê-lo silenciosamente.
6. Provenance é obrigatório para conhecimento e respostas relevantes.
7. Derived indexes devem ser reconstruíveis.
8. Graph é interface de navegação/contexto, não ornamento.
9. Graph capability ≠ Graph Database.
10. NOW = 1 e NEXT <= 3.
11. NOT NOW preserva possibilidades sem inflar o escopo.
12. O sistema deve exigir menos esforço de gestão do que a perda de contexto que evita.

## Federated Knowledge Fabric

Project OS deve conseguir compreender fontes distribuídas:

- Supabase/Postgres;
- GitHub;
- Git-backed Markdown;
- arquivos locais / Obsidian via Git bridge;
- Supabase Storage;
- chats;
- documentos externos;
- web;
- Vercel;
- futuras integrações.

O sistema deve saber:

- o que existe;
- onde existe;
- quem é autoridade;
- qual versão está sendo usada;
- quem pode acessar;
- como se relaciona;
- quando entra no contexto.

## Authority by domain

- Usuários/autenticação → Supabase Auth.
- Project State / NOW / NEXT / NOT NOW → Postgres.
- Candidates → Postgres.
- Checkpoints → Postgres.
- Run Cards → Postgres.
- Context Packs → Postgres.
- Source Registry → Postgres.
- Event Log → Postgres.
- Código / commits / PRs / issues → GitHub.
- Deployment state → Vercel.
- Conhecimento durável aceito → Git-backed Markdown.
- Arquivos binários gerenciados → Storage/origem.
- Search index → Postgres, derivado.
- Embeddings → pgvector, derivado.
- Graph index → Postgres, derivado.
- AI inference → nunca authority isoladamente.

## Conhecimento canônico inicial

- Decision
- Hypothesis
- Evidence
- Question
- Spec

## Objetos operacionais

- Project State
- Checkpoint
- Run Card
- Candidate

## Sources

- Chat
- Document
- Research artifact
- File
- PR
- Commit
- Web source
- Meeting
- Deployment/event source

## Derived

- Context Pack
- Signal
- Search Chunk
- Embedding
- Relation Suggestion
- Resume Synthesis

## Knowledge lifecycle

Source
→ Extraction
→ Candidate
→ Human Review
→ Canonical Knowledge
→ Index / Relations
→ Retrieval / Use

## Relações iniciais

- supports
- contradicts
- depends_on
- derived_from
- resolves
- implements
- supersedes
- mentions

Origem:

- explicit
- structural
- semantic
- inferred

Somente relações explicitamente confirmadas podem se tornar canônicas por padrão.

## Retrieval web

- Structured filtering
- Postgres FTS
- pgvector
- Hybrid ranking
- Graph traversal

QMD pode ser adapter local futuro, não runtime web.

## Graph

- Focus Graph = default.
- Global Graph = advanced.
- Sem Neo4j/Graphiti inicialmente.
- React Flow é candidato de UI.
- Relações ficam indexadas em Postgres.

## Context Pack

Artefato:

- derivado;
- bounded;
- source-agnostic;
- reproduzível;
- não canônico.

Pode combinar fontes de origens diferentes.

## AI

Papéis:

- Parsing
- Synthesis
- Retrieval assistance
- Reasoning
- Detection
- Context compilation

A IA não pode silenciosamente:

- aceitar Decision;
- validar Hypothesis;
- mudar NOW;
- fechar blocker;
- promover memória;
- criar relação canônica;
- mudar permissions.

## Stack-base

- Next.js / React / TypeScript
- Vercel
- Supabase / Postgres
- RLS
- Supabase Storage
- pgvector
- GitHub / GitHub App
- Git-backed Markdown
- React Flow
- Vercel AI SDK / AI Gateway

## Do not build now

- Neo4j
- Graphiti
- QMD web runtime
- custom vector DB
- custom search engine
- Obsidian plugin como UI principal
- generic Kanban
- Notion clone
- multi-agent framework
- workflow builder
- event sourcing
- microservices
- message bus
- native mobile app
- enterprise permission engine
- automatic memory promotion
- generic autonomous project manager

## Triggers futuros

Graph DB:
somente se queries reais demonstrarem limitação concreta do Postgres.

Local Companion:
somente se Git bridge gerar fricção significativa.

Dedicated Queue:
somente quando retries/durability/batch justificarem.

QMD:
somente para demanda local/offline/MCP.

Graphify:
somente se code architecture precisar de enriquecimento estrutural.

Cross-project Intelligence:
somente quando múltiplos projetos comprovarem reutilização real.

Multi-agent:
somente quando houver necessidade de contexto/tools/lifecycle isolados que skill/tool não resolva.
