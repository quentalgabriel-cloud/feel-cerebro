# Prompt de abertura — cole isto no início de uma thread nova

> Este é o único arquivo que você **cola**. Os outros são leitura para quem
> receber o prompt. Anexe o zip do projeto junto, ou aponte o repositório.

---

Você vai continuar o **Project OS** — o software; **Cérebro da Feel** é o
primeiro projeto rodando dentro dele. Não é um projeto novo: existe código
em produção, banco com dados reais, um plano de arquitetura congelado e um
histórico de erros já cometidos que não devem se repetir.

**Antes de propor ou escrever qualquer coisa, leia, nesta ordem:**

1. `handoff/01-ESTADO-REAL.md` — o que existe de fato, com IDs. Se algo
   nesse arquivo contradiz o que você deduziria do código, o arquivo está
   certo até você verificar o contrário com uma ferramenta.
2. `handoff/02-APRENDIZADOS.md` — as armadilhas já pagas com bug real.
   Ler isto evita repetir três falhas de segurança que já aconteceram aqui.
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
  `supabase/tests/verify.sh`.** Esse harness já pegou três bugs reais,
  dois deles vazamento entre organizações. Não é cerimônia.
- **Autorização mora no banco, nunca na UI.** Server Actions são
  alcançáveis por POST direto. Se a regra só existe no componente, ela não
  existe.
- **Teste allow *e* deny.** Um teste que só prova que o dono enxerga os
  próprios dados não prova nada — o bug mora em quem *não* deveria
  enxergar.
- **Nada é sobrescrito em silêncio.** Migration superada vai para
  `superseded/`, código parado fica parado com explicação, tentativa errada
  fica documentada no cabeçalho do arquivo que a corrigiu.
- **Empty state honesto.** Nenhuma tela finge ter dado que não tem, e
  "não há evidência suficiente" é resposta de sucesso quando é verdade.
- **Verificação é ver a resposta, não presumir.** Deploy sem erro não é
  prova de que o comportamento certo chegou em produção.
- **Documentação desatualizada conta como bug.** Se sua mudança invalida um
  trecho de doc, corrigir faz parte da mesma entrega.

**O estado hoje:** Fase 01 (Live Foundation) está em produção. Fase 02
(Continuity Core) é a próxima do caminho crítico. Existem três pendências
bloqueadas em ação humana, listadas em `01-ESTADO-REAL.md` — confira quais
foram resolvidas antes de assumir qualquer uma delas como pendente.

**Primeira coisa a fazer nesta thread:** ler os arquivos acima, então me
dizer (a) o que você entendeu que está pronto, (b) o que está bloqueado, e
(c) qual você acha que é o próximo movimento e por quê — antes de escrever
qualquer linha de código. Se discordar do plano, diga; ele é congelado, não
sagrado.
