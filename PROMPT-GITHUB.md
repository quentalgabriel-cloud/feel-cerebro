# Prompt — subir o Cérebro da Feel para o GitHub e ligar o deploy contínuo

> Cole isto numa rodada nova, **depois** de (1) o repositório privado
> `feel-cerebro` existir no GitHub e (2) ele estar autorizado como fonte
> desta sessão. Sem esses dois, o proxy de git recusa antes de qualquer
> coisa e o prompt não tem como funcionar — ver
> `SETUP-INFRAESTRUTURA.md` §1.

---

## Contexto que você já tem (não redescubra)

O repositório local vive em `/home/claude/feel-cerebro`. Está **completo,
commitado e limpo** na branch `main`, com seis commits organizados por
camada. Nada está pendente de commit. Antes desses commits foram
verificados e passaram: `npx tsc --noEmit`, `npm run lint`, `npm run build`
(11 rotas, sem rota vazando de `src/_fase03/`) e `supabase/tests/verify.sh`
(`RLS TEST: PASS`). A varredura de segredo nos 81 arquivos não achou nada.

O app já está em produção na Vercel (`feel-cerebro`, conta pessoal
`gquental`, `team_2sjFcoePiJ8zbmnwDwxRD3mu`, projeto
`prj_hGJNBOrBMLIABHAbi0uo1CA1Gstx`), hoje por **deploy de arquivo**, sem
ligação com repositório nenhum.

## O que fazer

**1. Confirme o acesso antes de tentar qualquer coisa.**

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/<OWNER>/feel-cerebro
```

`200` segue. `403` significa que o repositório não está autorizado para a
sessão — **pare e diga isso ao Gabriel**, não tente contornar com token na
URL, com outro path da API nem com outro host: todos batem no mesmo proxy.
`404` com `200` no owner significa que o repositório não existe ainda.

**2. Confira o que existe do outro lado antes de empurrar.**

O repositório precisa estar vazio ou ter história compatível. Se o GitHub
tiver um commit inicial próprio (README/`.gitignore` criados pela interface),
**não force nada** — traga com `git pull --rebase` e resolva, ou peça ao
Gabriel pra apagar e recriar vazio. `push --force` numa história que não é
sua é como se perde trabalho alheio.

**3. Empurre.**

```bash
cd /home/claude/feel-cerebro
git remote add origin https://github.com/<OWNER>/feel-cerebro.git
git push -u origin main
```

**4. Verifique que o projeto está OK lá — de verdade, não por otimismo.**

- A branch padrão é `main`.
- Os seis commits chegaram, com as mensagens inteiras (não truncadas).
- O repositório é **privado**. Se estiver público, avise imediatamente: o
  conteúdo é estratégia interna dos três sócios.
- Nenhum arquivo que não devia subir: `.env.local`, `node_modules/`,
  `.next/`, `*.tsbuildinfo`, `next-env.d.ts`. Confirme com
  `git ls-files | grep -E "env\.local|node_modules|\.next/|tsbuildinfo"`
  — tem que voltar vazio.
- Rode a varredura de segredo de novo no que foi publicado, não no que você
  acha que publicou.

**5. Troque o deploy de arquivo por deploy contínuo.**

Com o repositório no ar, `mcp__Vercel__create_git_project` liga push a
deploy. **Cuidado com uma armadilha conhecida:** essa ferramenta não
reconecta um projeto existente de mesmo nome que esteja desligado de
repositório. Confirme o comportamento antes de rodar — se ela criar um
projeto *novo*, você acaba com dois projetos e a URL de produção apontando
pro errado. Se for esse o caso, pare e diga; ligar o repositório pelo painel
da Vercel é um clique do Gabriel e não arrisca a URL que já está no ar.

Se conectar: confirme que as variáveis de ambiente do projeto atual
continuam lá (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) e que um push de teste gera
deploy de produção verde.

**6. Atualize a documentação e commite.**

`SETUP-INFRAESTRUTURA.md` §1 e §2 descrevem o estado bloqueado; depois do
push eles estão errados. Corrija-os no mesmo movimento — neste projeto
documentação desatualizada conta como bug.

## Regras que valem em tudo isto

- **Não force push, não reescreva história, não apague nada** sem o Gabriel
  pedir explicitamente.
- **Não crie repositório, org, nem convide ninguém** por conta própria.
- Se algo falhar duas vezes pelo mesmo motivo, **pare e explique** — não
  fique tentando variações do mesmo comando.
- Verificação é ver a resposta, não presumir. `push` sem erro não é prova de
  que o conteúdo certo chegou.
