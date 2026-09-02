# ADR-0007 — Falha de Server Action é visível

**Estado:** Aceito · 2026-09-03

## Contexto

Em 2026-09-02, Gabriel entrou no sistema, preencheu o formulário de criar
projeto e clicou em criar. Nada aconteceu. Sem erro, sem projeto, sem pista —
e ele tentou várias vezes antes de reportar, porque não havia como distinguir
"falhou" de "eu fiz errado".

A causa era uma linha: `if (!membership) return;`. A conta dele não tinha
organização (bug separado, corrigido em `lib/org-bootstrap.ts`), a ação saía
sem escrever nada, e o formulário submetia com sucesso. **A ação fez
exatamente o que o código mandava, e a interface mentiu.**

Esse padrão estava em todas as Server Actions do projeto: `return` mudo em
todo caminho de falha. Um bug de dado virou um bug de interface, e o de
interface foi o caro — escondeu o primeiro por horas.

## Decisão

**Toda Server Action alcançável por formulário devolve `ActionResult`**
(`{ ok: true } | { ok: false; message: string }`), e o formulário mostra a
mensagem. `components/action-form.tsx` embrulha `useActionState` e é por onde
todo formulário do app passa.

Três regras que vêm junto:

1. **Erro de leitura nunca vira empty state.** Página que renderiza "nada
   ainda" quando a query falhou mente com confiança — pior que tela branca,
   porque tela branca ninguém interpreta como dado (`components/data-error.tsx`).
2. **Escrita que falha não apaga o que a pessoa digitou.** O Quick Capture só
   limpa o campo depois da confirmação.
3. **Toda falha inesperada vai para `console.error` no servidor**, com o nome
   da ação — ficam nos logs da Vercel.

Exceção única e deliberada: `logEvent()` engole o próprio erro. Perder uma
linha de histórico é menos grave que impedir alguém de mexer no NOW.

## Alternativas descartadas

**Lançar exceção e deixar o error boundary pegar.** Transforma "NEXT chegou
no teto" — que é resposta normal do domínio — em tela de erro. Falha
esperada não é exceção.

**Toast global.** Some sozinho, não fica perto do campo que causou o
problema, e exige estado global para um problema local.

**Só logar no servidor.** Foi o que existia. O log estava certo e ninguém o
leu, porque ninguém sabia que havia o que ler.

## Consequências

**Bom.** Cada falha tem dono e mensagem. A mensagem diz o que fazer
("Conclua ou remova um antes de adicionar outro"), não só que deu errado. O
E2E consegue **afirmar a recusa** — a suíte verifica que o quarto NEXT é
recusado com mensagem, o que antes era indistinguível de sucesso.

**Ruim, e assumido.** Todo formulário vira Client Component, e as ações
carregam um parâmetro `_estado` que a maioria não usa. Custo pequeno, pago
uma vez.

## Gatilho de revisão

Nenhum previsto. Se um dia houver mensagem de erro que não ajuda ninguém, o
problema é o texto — não a decisão de mostrá-lo.
