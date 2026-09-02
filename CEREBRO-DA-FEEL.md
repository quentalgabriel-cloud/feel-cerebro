# Cérebro da Feel — documento fundacional

> Escrito em 2026-08-27, consolidando as decisões, pesquisas e questões em
> aberto de uma série de conversas entre Gabriel e um agente Claude. Gabrielle
> e Axel não participaram dessas conversas — este documento existe para que
> vocês dois entendam o projeto inteiro sem precisar ter estado lá.

---

## 0. Para quem é este documento, e como lê-lo

Este documento distingue três coisas, e a distinção importa mais do que
qualquer conteúdo dentro delas:

- **Decidido** — já foi resolvido, com uma razão registrada. Mudar exige
  evidência nova, não preferência.
- **Possibilidade mapeada** — foi considerada, comparada com alternativas, e
  colocada de lado por um critério explícito. Pode ser revisitada se o
  contexto mudar, mas não é o padrão atual.
- **Em aberto** — genuinamente não decidido. Precisa de um "sim" dos três
  antes de virar código.

Onde este documento erra essa distinção, ele está errado — porque vira a
fonte que vocês vão citar depois, e "eu achei que já tínhamos decidido isso"
é o tipo de mal-entendido que este projeto existe para evitar.

Este documento é a visão geral. O detalhe técnico do banco de dados vive em
`MODELO-DE-DADOS.md`, no mesmo diretório — este arquivo resume, aquele
especifica.

---

## 1. Origem e objetivo

Gabriel, Gabrielle e Axel estão desenhando juntos o projeto Feel. Cada um
acumula pensamentos, interpretações, conclusões, materiais, registros e
histórico de conversas com IA (GPT, Claude) que, nas palavras de Gabriel,
"muitas vezes ficam soltos". A mesma coisa acontece com Gabrielle e Axel.

O objetivo declarado não é arquivar esse material — é **cruzá-lo**. A ideia é
que um cérebro da Feel, como organização, ajude os três a "extrair o que de
melhor vem de cada um, encontrar possibilidades, avaliar cenários, encontrar
sinergias de ideias, gargalos, hipóteses, equívocos, confusões,
inconsistências", para que as decisões do negócio sejam "mais inteligentes e
baseadas em dados e não só em feeling".

Duas coisas nessa formulação merecem ficar explícitas porque mudam o desenho
inteiro:

**A tese ainda está em construção.** Isso não é um projeto de documentar um
negócio já definido — é um projeto de usar o próprio material dos três para
descobrir, junto, o que o negócio é. Os eixos que organizam a Feel ainda não
existem como lista acordada (ver seção 8).

**A ambição final é maior que o cérebro, mas o cérebro vem primeiro.** A
intenção de longo prazo é que este sistema vire "uma inteligência que nos
ajuda até na gestão do negócio" — mas explicitamente **não** um super-app
agora. "Estamos desenvolvendo as bases pra isso. A primeira fase é o
cérebro." Toda decisão de escopo neste documento respeita essa ordem: memória
e cruzamento primeiro, operacionalização (projetos, calendário, pessoas)
depois — nunca ao contrário.

---

## 2. Princípios do sistema

**Este é um sistema novo, separado do Cérebro pessoal do Gabriel.** Não é
uma extensão, não herda as restrições daquele projeto, e uma decisão tomada
lá (por exemplo, "a UI é só leitura") não vale aqui a menos que seja repetida
explicitamente. Onde os dois sistemas compartilham vocabulário — as seis
classes de conhecimento, os campos de proveniência — é porque o vocabulário
provou seu valor lá, não porque os sistemas são o mesmo projeto.

Princípios **decididos** para o Cérebro da Feel:

1. **Fato ≠ evidência ≠ inferência ≠ hipótese ≠ decisão.** Uma nota carrega
   o seu estado epistêmico explicitamente; repetição não promove hipótese a
   fato.
2. **Nada é sobrescrito em silêncio.** Uma nota superada muda de status; não
   é apagada nem editada por cima.
3. **Captura é automática, promoção é seletiva.** Qualquer um dos três pode
   jogar qualquer coisa no sistema sem fricção. Nada vira conhecimento
   consolidado (visível no grafo, citável, relacionado a outras notas) sem
   passar por uma decisão deliberada de promoção.
4. **Toda escrita tem autor.** Uma pessoa real, ou "sistema" quando for um
   processo automático — nunca autoria ausente ou ambígua. É o que permite
   ao cérebro um dia responder "vocês dois chegaram na mesma conclusão por
   caminhos diferentes", que é justamente o tipo de sinergia que o projeto
   existe para encontrar.
5. **A fonte bruta nunca é substituída pelo resumo.** O PDF, o DOCX, o texto
   colado original continuam acessíveis enquanto a nota que vieram a gerar
   existir.
6. **Relação entre notas é sempre tipada, e uma relação proposta por
   máquina não é verdade até um humano confirmar.** O sistema pode sugerir
   que duas notas se conectam; só uma decisão humana torna isso uma aresta
   real do grafo.

---

## 3. Arquitetura

**Decidido:** Vercel (aplicação web) + Supabase (Postgres, autenticação,
armazenamento de arquivo, busca por similaridade) + GitHub (histórico de
conhecimento consolidado), em projetos novos nas três plataformas —
**separados** do repositório Ecossistema Feel, que é sobre o produto
(linguagem visual, tokens, telas), não sobre o negócio.

**Atualizado em 2026-08-28** — conta/organização por plataforma, decidido
por Gabriel ("por minha conta e risco"): GitHub e Supabase continuam em
organização nova e dedicada à Feel (ambas gratuitas nesse volume, sem
motivo pra abrir mão da separação). **Vercel é exceção, por enquanto**: o
app roda na conta pessoal gratuita (Hobby) do Gabriel, não num team novo
pago. Ver justificativa e o gatilho de revisão logo abaixo.

A decisão central da arquitetura é uma fronteira entre dois ritmos de
escrita:

```
             captura de alta frequência          conhecimento consolidado
             (rascunho, operacional)              (raro, deliberado)

  upload/cola  ──►  Supabase (Postgres)  ──promoção──►  Markdown no GitHub
  na UI             itens_inbox,                        04-memoria/, com
                     arquivos_raw,                       frontmatter e
                     relações propostas                  histórico de commit
                          ▲                                    │
                          │                                    ▼
                          └──────── projeção de leitura ◄── indexador
                                    (o grafo que a UI mostra)
```

A promoção é **de mão única**: inbox vira nota no Git; nada volta do Git para
o inbox. A leitura que a UI mostra vem sempre de uma projeção recalculada a
partir do Git, nunca de uma edição direta no banco.

**Por que essa fronteira, e não tudo num lado só** — duas alternativas foram
descartadas, com razão registrada:
- *Tudo no Postgres, Git só guarda código*: perderia o histórico revisável e
  a leitura direta por agentes que o Markdown oferece.
- *Tudo em Markdown no Git, banco só como índice*: cada escrita da UI viraria
  um commit — inviável com três pessoas escrevendo com frequência, e frágil
  para arquivo grande dentro do limite de tempo de uma função da Vercel.

**Restrições de plataforma que o projeto precisa respeitar, verificadas
nesta pesquisa:**
- Vercel Hobby é explicitamente restrito a uso não-comercial e pessoal
  (termos da própria Vercel). Isso continuava valendo quando o plano era
  "Feel já é o negócio rodando ali" — daí a recomendação original de Pro
  (~US$20/mês por assento de quem edita no painel). **Não vale ainda**: o
  projeto está em fase de protótipo interno, não foi "colocado na rua como
  produto" — Gabriel avaliou o risco e autorizou explicitamente rodar no
  Hobby pessoal enquanto isso for verdade. **Gatilho de revisão:** no
  momento em que o Cérebro da Feel deixar de ser protótipo interno e virar
  algo usado como parte da operação comercial da Feel (não só os três
  fundadores testando), essa decisão precisa ser revisitada — Pro (ou um
  team dedicado) volta a ser necessário, não antes.
- Supabase no plano gratuito pausa o projeto depois de cerca de uma semana
  sem atividade (dados preservados, projeto inacessível até religar). Mitigado
  por uma tarefa agendada semanal que também serve outros propósitos (ver
  seção 6).

---

## 4. Modelo de dados

Especificado por completo em `MODELO-DE-DADOS.md`. Resumo do essencial:

Oito tabelas no Postgres — `pessoas`, `arquivos_raw`, `itens_inbox`,
`eixos`, `notas_promovidas`, `relacoes`, mais duas de junção — e um id
humano-legível (`DEC-001`, no mesmo formato do vault pessoal) para toda nota
promovida, que sobrevive para sempre e aparece em link, em conversa e em
commit.

Dois pontos decididos que vale destacar aqui porque protegem o objetivo do
projeto, não só a base de dados:

- **`eixo_id` existe em toda nota desde o primeiro registro, mesmo antes de
  a lista de eixos existir.** Sem isso, o dia em que os eixos forem
  definidos exigiria migrar retroativamente cada nota já promovida.
- **Toda relação entre notas carrega quem propôs.** `null` significa "o
  sistema propôs" — é a peça que faz "encontrar sinergias" (o objetivo
  original) ser uma coluna de banco, não uma promessa vaga.

---

## 5. Fluxo de captura e promoção

Em uma frase por etapa — o detalhe técnico de qual função executa o quê está
em `MODELO-DE-DADOS.md` §3:

1. Um dos três cola texto ou arrasta um arquivo (PDF, DOCX, planilha, texto)
   na interface web — sem instalar nada, sem aprender Markdown.
2. O sistema extrai texto do arquivo automaticamente e o item aparece numa
   lista de captura visível aos três.
3. Qualquer um dos três pode **promover** um item: classificar o mínimo
   necessário (tipo de conhecimento, eixo se já souber, estado epistêmico) e
   confirmar.
4. A promoção gera uma nota Markdown versionada no GitHub, com o histórico
   de quem escreveu o quê e quando preservado para sempre.
5. Uma vez por semana, um processo automático relê o conhecimento
   consolidado e propõe conexões candidatas entre notas — que ficam
   marcadas como sugestão até alguém confirmar.

---

## 6. Ferramentas de terceiros — o que entra e o que fica de fora

Antes de escrever qualquer parte custosa deste sistema à mão, uma varredura
deliberada em soluções open source já existentes, com critério de aceitação
explícito (licença compatível, manutenção ativa, resolve um problema
nomeado, custo proporcional, não reintroduz o que já foi descartado por
decisão).

**Adotado:**
- **MarkItDown** (Microsoft, MIT) — converte PDF, DOCX, planilha,
  apresentação, imagem e mais para texto limpo. Substitui um par de
  bibliotecas mais limitadas que cobririam só PDF e DOCX.
- **SemHash** (MIT, dependências mínimas) — faz a metade barata de "achar
  conexões candidatas": aponta pares de notas semanticamente parecidas antes
  de qualquer julgamento mais caro decidir se a conexão é real.

**Considerado e descartado, com o porquê preservado:**
- **Decap CMS** — resolveria "escrever Markdown no GitHub a partir da web",
  mas é um produto de edição completo, com convenções próprias que
  substituiriam o controle fino que o modelo de dados já define. O problema
  que ele resolve já é resolvido em poucas linhas com a API oficial do
  GitHub.
- **Validadores de grafo de conhecimento prontos** — nada encontrado além de
  frameworks acadêmicos sem uso prático maduro. As checagens que o sistema
  precisa (nota órfã, contradição não resolvida) continuam em código
  próprio, simples e auditável.
- **Ferramentas prontas de PKM com grafo** (AFFiNE, Anytype, SiYuan, e
  outras) — resolvem um problema adjacente, não o problema deste projeto:
  nenhuma cruza captura heterogênea de três pessoas com promoção deliberada
  para um schema próprio da Feel (eixos, estado epistêmico, confiança,
  relação tipada). Adotar qualquer uma delas significaria abandonar o
  modelo de dados já revisado.
- **Colaboração em tempo real (CRDT)** — não há, até agora, evidência de que
  duas pessoas vão editar a mesma nota promovida ao mesmo tempo. Fica de
  fora até essa necessidade aparecer de verdade.

---

## 7. A experiência imaginada, e o caminho até lá

A visão descrita pelos fundadores para a primeira interface é um **mapa
dinâmico com zoom in/out** — não um dashboard estático, um espaço que se
navega. A razão declarada: a Feel é um ecossistema complexo, com eixos ou
frentes que pedem atenção em momentos diferentes, e o valor do mapa é deixar
visível, de forma visual e prática, "quais são os eixos que precisam de
atenção, o que precisa ser desenvolvido em cada um deles, o que tem conexão
com o quê" — iniciativas, decisões, regras, ideias, e onde cada uma está
posicionada.

A visão de longo prazo vai além do mapa: telas adicionais que sejam "o
desdobramento disso" — a operacionalização das decisões, não só o modelo do
negócio. Os exemplos citados são gestão de projetos, calendário, pessoas e
responsabilidades, iniciativas.

Essa visão é **coerente e vale a pena construir** — mas na ordem certa. O
mapa com território estável (a premissa de que você se orienta porque cada
eixo fica sempre no mesmo lugar) só funciona se os eixos já existirem e
forem razoavelmente estáveis. Hoje eles não existem — "definir os eixos faz
parte do trabalho", segundo a própria resposta dos fundadores. Construir o
mapa territorial antes disso produziria um território que se reorganiza a
cada poucas semanas, o que destrói exatamente a orientação espacial que é o
ponto do mapa.

Por isso, três fases, cada uma com um critério de entrada — nenhuma começa
antes da anterior produzir o que a próxima precisa:

**Fase 1 — Captura e memória.** Upload e colagem funcionando, promoção
funcionando, dezenas de notas reais dos três no ar. Critério de saída: massa
crítica de material promovido suficiente para uma sessão de convergência
enxergar padrão de verdade, não just alguns exemplos soltos.

**Fase 2 — Convergência e mapa.** Uma sessão (ou mais de uma) em que os três,
com o material da Fase 1 na mesa, definem os eixos reais da Feel. Só depois
disso o mapa territorial — a tela imersiva com zoom que os fundadores
descreveram — é construído, porque só então o território tem algo estável
para representar.

**Fase 3 — Operacionalização.** Projetos, calendário, pessoas, iniciativas.
O modelo de dados já reserva o encaixe (cada iniciativa aponta para a nota
que a originou), mas nenhuma dessas telas é construída antes de o cérebro
provar que o cruzamento de informação já gera valor por si só.

---

## 8. Quarentena — o que não se constrói ainda

- ❌ Qualquer tela de operacionalização (Fase 3) antes da Fase 1 rodar de
  verdade com os três.
- ❌ O mapa territorial (Fase 2) antes dos eixos existirem como lista
  acordada.
- ❌ Colaboração em tempo real (CRDT) sem uma necessidade confirmada de
  edição simultânea da mesma nota.
- ❌ Qualquer PKM pronto (AFFiNE, Anytype e afins) como substituto do
  sistema — resolvem um problema diferente do da Feel.
- ❌ Banco de grafo dedicado (Neo4j e afins) — o volume e a forma de uso não
  justificam; Postgres com tabela de relações resolve.
- ❌ Detecção automática de contradição sem revisão humana — o sistema
  propõe, uma pessoa confirma, sempre.

---

## 9. Perguntas em aberto

Nenhuma destas tem resposta ainda. Cada uma precisa de um "sim" explícito
dos três antes de virar decisão.

| Pergunta | Quem decide | O que muda dependendo da resposta |
|---|---|---|
| Quais são os eixos reais da Feel? | Os três, na sessão de convergência da Fase 2 | Define o território do mapa; sem isso, a Fase 2 não começa. |
| Existe um ritual fixo de revisão (dia e hora certos)? | Os três | Um cérebro compartilhado sem momento acordado de uso tende a esvaziar — a própria sessão de convergência da Fase 2 é uma oportunidade de estabelecer essa cadência. |
| Nome do repositório e dos projetos (Vercel/Supabase/GitHub) | Os três | Sugestão em uso: `feel-cerebro`. Não confirmado. |
| Promoção commita direto na branch principal, ou passa por revisão (PR) antes? | Os três | Afeta a permissão que a integração com o GitHub precisa ter. |
| Extração de arquivo muito grande — processamento imediato ou fila? | Decisão técnica, mas vale testar com um arquivo real antes de assumir | Hoje assumido como imediato, dado o volume declarado de dezenas de itens. |
| Promoção exige confirmação de mais de uma pessoa, ou qualquer um promove sozinho? | Os três | Hoje assumido como individual — uma discordância vira uma relação de contradição proposta depois, não um bloqueio antes. |
| O inbox é visível aos três desde a captura, ou existe um estado de rascunho privado? | Os três | Hoje assumido como visível a todos desde o início, porque cruzar os três inputs é o objetivo declarado do projeto. |
| Por quanto tempo os arquivos originais (PDF, DOCX) ficam retidos? | Os três, quando o volume começar a se aproximar do limite de armazenamento gratuito | Hoje assumido como indefinido. |

---

## 10. Rastreabilidade

Este documento consolida decisões e pesquisas de uma sequência de conversas
entre Gabriel e um agente Claude, em 2026-08-27: a mensagem original dos três
fundadores descrevendo o objetivo do projeto; uma rodada de perguntas de
calibração sobre ferramenta, eixos, cadência e volume; a decisão explícita
de arquitetura (Vercel + Supabase + GitHub); a especificação do modelo de
dados (`MODELO-DE-DADOS.md`); e uma varredura de soluções open source
complementares. Nenhuma dessas fontes está fora do alcance dos três — peçam
o histórico da conversa a Gabriel se algum raciocínio aqui parecer
incompleto.
