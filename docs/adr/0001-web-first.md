# ADR-0001 — Web first, sem app nativo

**Estado:** Aceito · 2026-08 (registrado formalmente em 2026-09-03)

## Contexto

O sistema precisa estar acessível para três sócios que trabalham em máquinas
diferentes, em horários diferentes, e que precisam capturar coisa no meio de
uma conversa. A tentação óbvia é "então precisa de app no celular".

Precisa de **captura sem fricção**. Isso não é a mesma coisa que app nativo.

## Decisão

Uma aplicação web, responsiva, servida por HTTPS. Sem app nativo, sem
wrapper, sem PWA instalável no V1.

## Alternativas descartadas

**App nativo (ou React Native).** Dobra a superfície de manutenção, exige
ciclo de publicação em loja e resolveria, no V1, exatamente um problema —
atalho na tela inicial — que o navegador já resolve. Nenhuma capacidade da
Fase 01 à 09 depende de hardware do aparelho.

**Desktop (Electron/Tauri).** Mesmo custo, e o argumento de "atalho global de
teclado" foi resolvido dentro do app (⌘K) para o caso que importa: capturar
enquanto se está usando o sistema.

**Só Obsidian, sem web.** O conhecimento canônico vai mesmo viver em Markdown
que o Obsidian lê (D-14). Mas Obsidian não tem estado compartilhado, não tem
autorização e não responde "o que importa agora para nós três". A camada de
orientação é o produto; o editor não é.

## Consequências

**Bom.** Um deploy, uma base de código, uma stack. Deploy contínuo por push.
Nada a instalar para um sócio novo entrar.

**Ruim, e assumido.** Sem offline. Sem notificação push. Sem atalho global do
sistema operacional — capturar exige o app aberto, e essa é uma fricção real
que só o uso vai dizer se dói.

## Gatilho de revisão

Dogfood mostrar que captura fora do app é o que não acontece. Nesse caso a
primeira resposta ainda não é app nativo: é um endpoint de captura por
atalho/bookmarklet/e-mail, que custa uma ordem de grandeza menos.
