# ADR-0006 — Email e senha no lugar do magic link

**Estado:** Aceito · 2026-09-02

## Contexto

O login nasceu como magic link (`signInWithOtp`) — sem senha para guardar,
sem senha para vazar, e prova de posse do e-mail a cada entrada.

Em produção, o link do e-mail levava para `localhost`. A causa não era o
código: o Supabase Auth só aceita como destino uma URL que esteja na
allow-list do painel, e ignora `emailRedirectTo` silenciosamente quando não
bate, caindo no Site URL padrão. Gabriel ajustou a configuração e **o
redirecionamento continuou preso em `localhost`**.

O detalhe que decidiu: essa configuração vive só no painel do Supabase — não
há ferramenta que a leia ou altere, então cada tentativa de diagnóstico
custava um ciclo humano. E **todos** os fluxos por e-mail (magic link,
confirmação de cadastro, recuperação de senha) dependem do mesmo mecanismo
quebrado. Enquanto isso, ninguém conseguia entrar; o dogfood — pré-condição
dura da Fase 02 — estava bloqueado por um problema de configuração de painel.

## Decisão

Login por **email e senha** (`signInWithPassword`), que devolve a sessão na
própria resposta da chamada e não depende de link de e-mail nem de allow-list
de redirect.

**Sem autocadastro público.** As contas dos três são provisionadas
diretamente, com senha aleatória.

## Alternativas descartadas

**Insistir no magic link.** Provavelmente resolvível, custo desconhecido, e
cada iteração dependia de alguém abrir um painel. Manter o sistema
inutilizável para depurar configuração de terceiro não se pagava.

**OAuth (Google).** Resolveria de verdade e é a melhor opção técnica das
três — mas exige configurar provider, credenciais e domínio autorizado: mais
configuração de painel, que é exatamente a categoria de coisa que estava
falhando.

**Senha + confirmação de e-mail obrigatória.** Reintroduz o link de e-mail no
caminho crítico, ou seja, o bug de volta.

## Consequências

**Bom.** Login não depende de e-mail em nenhum passo. Um único ponto de falha
a menos entre a pessoa e o sistema. E2E fica possível sem caixa de entrada.

**Ruim, e assumido.** Segurança de autenticação diminuiu: o magic link
provava posse do e-mail a cada entrada; senha prova apenas conhecimento da
senha. Sem 2FA. Sem recuperação de senha — quem perder a sua precisa de
intervenção. Existe senha para vazar, o que antes não existia.

Mitigação: **não há autocadastro** — conta não provisionada não existe, o que
elimina a pior consequência prática (qualquer pessoa criando conta com um
e-mail que não é dela).

Efeito colateral medido depois: o security advisor do Supabase, que estava
zerado, passou a acusar `auth_leaked_password_protection` desabilitado — um
aviso que só existe porque agora existe senha. Fica registrado em
`../SECURITY.md §5` com a correção (um toggle no painel).

A rota `/auth/callback` fica parada, sem uso, para quando um fluxo de
recuperação de senha existir.

## Gatilho de revisão

Qualquer um destes: alguém de fora dos três precisar de acesso; a
configuração de URL do Supabase ser confirmada funcionando (o que reabre
magic link e recuperação de senha como opções reais); ou o sistema deixar de
ser protótipo interno — nesse caso, OAuth passa a ser a resposta certa.
