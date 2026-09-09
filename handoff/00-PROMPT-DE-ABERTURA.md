# Prompt de abertura — cole isto no início de uma sessão nova

> Este é o único arquivo que você **cola**. Os outros são leitura para quem
> receber o prompt. Se a ferramenta trabalha dentro do repositório (Codex,
> Claude Code), basta apontar a pasta; se não, anexe o zip do projeto.
>
> Última revisão: 2026-09-09.

---

Você vai continuar o **Project OS** — o software; **Cérebro da Feel** é o
primeiro projeto rodando dentro dele. Não é um projeto novo: existe código em
produção, banco com dados reais, uma ponte entre Git e web já construída, um
plano de arquitetura congelado, e um histórico de erros já cometidos que não
devem se repetir.

**Antes de propor ou escrever qualquer coisa, leia, nesta ordem:**

0. `handoff/05-CODEX.md` — **se você é o Codex, ou qualquer agente rodando
   na máquina do Gabriel.** Diz o que você tem na mão, o que não tem, e como
   fazer sem o que falta. Pule se não for o caso.
1. `handoff/01-ESTADO-REAL.md` — o que existe de fato, com números
   verificados. Se algo nesse arquivo contradiz o que você deduziria do
   código, o arquivo está certo até você verificar o contrário com uma
   ferramenta — e aí corrija o arquivo na mesma entrega.
2. `handoff/02-APRENDIZADOS.md` — as armadilhas já pagas com bug real.
   Ler isto evita repetir quatro falhas de segurança que já aconteceram aqui.
3. `handoff/03-METODO-E-GOVERNANCA.md` — como se trabalha neste projeto.
   O protocolo de execução e o harness de verificação não são opcionais.
4. `MASTER-IMPLEMENTATION-PLAN.md` — o plano congelado: decisões D-01 a
   D-16, contratos das Fases 01 a 09, registro de risco.
5. `handoff/04-ARQUITETURA-ADIANTE.md` — para onde a arquitetura deve ir e
   quais decisões continuam abertas.

**Regras que valem para tudo que você fizer aqui:**

- **Arquitetura congelada só muda por registro formal.** Se sua proposta
  contraria uma decisão D-01..D-16, você não a implementa: escreve um
  `ARCHITECTURE DEVIATION` dizendo qual decisão, por quê, o que quebra e
  qual o custo de não mudar — e espera resposta do Gabriel.
- **Nenhuma migration toca o banco de produção antes de passar em
  `supabase/tests/verify.sh`.** Esse harness já pegou três bugs reais, dois
  deles vazamento entre organizações. Não é cerimônia.
- **Autorização mora no banco, nunca na UI.** Server Actions são alcançáveis
  por POST direto. Se a regra só existe no componente, ela não existe.
- **Nada em `public` é executável por `anon`, e nada em `public` é
  `SECURITY DEFINER`.** Função que precisa de poder emprestado mora em
  `private`, que o PostgREST não expõe. A seção 9 do `rls_test` varre o
  catálogo e derruba a suíte se isso for violado — inclusive por função que
  você criar sem perceber.
- **Teste allow *e* deny.** Um teste que só prova que o dono enxerga os
  próprios dados não prova nada — o bug mora em quem *não* deveria enxergar.
  E teste de RLS rodado como `postgres` não testa nada: `set local role
  authenticated` é obrigatório.
- **Documentar uma armadilha não protege contra ela; só teste que roda
  protege.** Se você se pegar escrevendo "agora eu lembro de sempre fazer X",
  transforme X em teste. Isso está aqui porque já falhou: a lição estava
  escrita e foi repetida uma semana depois (aprendizado 2b).
- **Comando que não faz nada é pior que comando nenhum.** Se não mediu, não
  afirme que protege.
- **Nada é sobrescrito em silêncio.** Migration superada vai para
  `superseded/`, código parado fica parado com explicação, tentativa errada
  fica documentada no cabeçalho do arquivo que a corrigiu.
- **Empty state honesto.** Nenhuma tela finge ter dado que não tem, falha de
  leitura não aparece como lista vazia, e "não há evidência suficiente" é
  resposta de sucesso quando é verdade.
- **Verificação é ver a resposta, não presumir.** Deploy sem erro não é prova
  de que o comportamento certo chegou em produção.
- **Documentação desatualizada conta como bug.** Se sua mudança invalida um
  trecho de doc, corrigir faz parte da mesma entrega.

**O estado hoje, em uma frase:** a Fase 01 e a ponte de conhecimento inteira
estão em produção e funcionando — e **quase não são usadas**. 55 itens de
conhecimento (todos vindos do vault que já existia), 0 uploads, 0 eventos, 0
itens de NOW/NEXT. O maior risco do projeto não é técnico.

**Primeira coisa a fazer nesta sessão:** ler os arquivos acima, então me
dizer (a) o que você entendeu que está pronto, (b) o que está bloqueado, e
(c) qual você acha que é o próximo movimento e por quê — antes de escrever
qualquer linha de código. Se discordar do plano, diga; ele é congelado, não
sagrado.
