# Prompt 01 — Live Foundation & First Functional Product

Execute sob `00_EXECUTION_KERNEL.md`.

## Missão

Criar a primeira versão funcional e permanente do Project OS, publicada no Vercel.

Ao final:

access → authenticate → create/open Project → objective → NOW → NEXT (max 3) → NOT NOW → Quick Capture → reload → state preserved.

## Tese

> O Project OS já consegue funcionar como camada persistente de orientação do projeto?

## Pre-flight

Inspecione repo, stack, Vercel, Supabase, docs, migrations e deploy.

Se não existir, crie a fundação.

## Stack

- Next.js / React / TypeScript
- App Router
- Supabase
- Vercel
- Tailwind/shadcn se adequado
- testes atuais e compatíveis

Verifique versões atuais antes de scaffolding.

## Repo

Single application repository por default.

Criar:

- README
- docs/ARCHITECTURE.md
- docs/SCOPE.md
- docs/SECURITY.md
- docs/adr/

ADRs mínimos:

- Web First
- Authority by Domain
- Supabase Operational Core
- Git-backed Durable Knowledge
- Graph Without Graph Database

## UI foundation

Dark premium, hierarchy clara, rounded surfaces, accent quente.

Criar App Shell:

- Project Switcher
- NOW
- WORK
- MEMORY
- EXPLORE
- Settings

NOW funcional.
WORK/MEMORY/EXPLORE com empty states reais, sem mock future data.

## Auth + tenancy

Supabase Auth.
Workspace pessoal automático se útil.

Modelar:

- profiles
- organizations
- organization_members
- projects
- project_state
- candidates
- events

Criar `sources` apenas se o planning freeze confirmar necessidade nesta fase.

Roles:

- owner
- builder
- viewer

## Project State

Representar:

- objective
- phase se necessário
- NOW
- NEXT <= 3
- NOT NOW

Não criar task manager.

## Project creation

Input mínimo:

- Project Name
- What are we building?
- Why does it need to exist?

Criar Project + initial state + event de forma consistente.

## NOW UI

Mostrar:

- Objective
- NOW (um)
- NEXT (até 3; add/edit/remove/reorder)
- NOT NOW (capture/remove/promote quando fizer sentido)
- Recent Changes baseado em Events

Sem IA.

## Quick Capture

Global e com baixa fricção.
Text-only nesta fase.
Cria Candidate bruto `pending`.

Não promover para Memory canônica ainda.

## MEMORY

Mostrar Captures/Candidates reais, claramente marcados como “not canonical”.

## WORK

Mostrar estado inicial com base no NOW/Objective.
Sem PRs fake.

## EXPLORE

Mostrar empty state real.
Sem graph fake.

## Events

Criar inicialmente:

- project.created
- project_state.updated
- candidate.created

Append-only. Não event sourcing.

## RLS

Testar:

- owner/builder acesso esperado;
- unrelated user negado;
- unauthenticated negado.

## Tests

Unit:
- NEXT <= 3
- state validation

DB:
- RLS

E2E:
authenticate → create project → set NOW/NEXT/NOT NOW → Quick Capture → reload → persistence.

## Deploy

Publicar cedo no Vercel.
Configurar env.
Verificar produção de verdade.

## Dogfood

Criar Project “Project OS”.
Registrar objective real.
Definir NOW real.
Definir NEXT <= 3.
Colocar future ideas em NOT NOW.
Criar Quick Capture real.

## Não implementar

- canonical knowledge Git
- AI parsing
- embeddings
- Ask
- graph
- Context Packs
- GitHub execution
- Run Cards
- MCP
- Graphiti/QMD/Graphify
- Obsidian integration

## Acceptance

- URL produção
- auth
- project CRUD essencial
- objective
- NOW
- NEXT <= 3
- NOT NOW
- Candidate via Quick Capture
- Events / Recent Changes
- RLS
- migrations
- CI
- dogfood

## Gate

PHASE 01 RESULT: PASS/PARTIAL/FAIL
PRODUCTION URL
CRITICAL FLOWS VERIFIED
RLS VERIFIED
DOGFOOD VERIFIED
READY FOR PHASE 02: YES/NO
