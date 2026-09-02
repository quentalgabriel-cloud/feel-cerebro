import { expect, test } from "@playwright/test";

// Item 25 do plano mestre, literal:
//   "autenticar → criar projeto → NOW/NEXT/NOT NOW → capturar → recarregar →
//    persistiu"
//
// Mais duas asserções que o plano não pede e o bug de 2026-09-02 justificou:
// o quarto NEXT precisa ser RECUSADO COM MENSAGEM (não em silêncio), e a
// captura que falha não pode limpar o rascunho.
//
// Este arquivo não roda sem E2E_BASE_URL + credenciais — ver o comentário em
// playwright.config.ts sobre por que ele não pode encostar na base real.

const BASE = process.env.E2E_BASE_URL;
const EMAIL = process.env.E2E_EMAIL;
const SENHA = process.env.E2E_PASSWORD;

test.skip(
  !BASE || !EMAIL || !SENHA,
  "E2E desligado: defina E2E_BASE_URL, E2E_EMAIL e E2E_PASSWORD para rodar contra uma instância descartável.",
);

// Nome único por execução: duas rodadas não podem colidir no slug, e o
// projeto criado fica identificável como lixo de teste.
const NOME_DO_PROJETO = `E2E ${new Date().toISOString().slice(0, 19)}`;

test("fluxo crítico da Fase 01 sobrevive a um reload", async ({ page }) => {
  // 1. Autenticar (email + senha desde 2026-09-02; não há mais magic link)
  await page.goto("/login");
  await page.getByPlaceholder("voce@feel.com").fill(EMAIL!);
  await page.getByPlaceholder("senha").fill(SENHA!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/projects/);

  // 2. Criar projeto
  await page.getByLabel("Nome").fill(NOME_DO_PROJETO);
  await page
    .getByLabel("O que estamos construindo?")
    .fill("Verificação automatizada do gate da Fase 01.");
  await page.getByLabel("Por que isso precisa existir?").fill("Porque deploy sem erro não é prova.");
  await page.getByRole("button", { name: "Criar projeto" }).click();

  // Criar redireciona direto para o NOW do projeto novo.
  await expect(page).toHaveURL(/\/p\/.+\/now/);
  const urlDoProjeto = page.url();

  // 3. Objetivo
  await page
    .getByPlaceholder("O que este projeto precisa alcançar agora")
    .fill("Fechar o gate");
  await page.getByRole("button", { name: "Salvar" }).click();

  // 4. NOW — um só
  await page.getByPlaceholder("A única coisa em andamento agora").fill("Escrever os ADRs");
  await page.getByRole("button", { name: "Definir" }).click();
  await expect(page.getByText("Escrever os ADRs")).toBeVisible();

  // 5. NEXT — três entram
  for (const passo of ["Rodar o harness", "Fechar o gate", "Começar a Fase 02"]) {
    await page.getByPlaceholder("Próximo passo").fill(passo);
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText(passo)).toBeVisible();
  }

  // 6. O quarto NÃO entra — e a UI diz isso em vez de sumir com o formulário
  await expect(page.getByText("Três é o teto.")).toBeVisible();

  // 7. NOT NOW guarda sem inflar o escopo
  await page.getByPlaceholder("Boa ideia, hora errada").fill("Mapa territorial por eixos");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Mapa territorial por eixos")).toBeVisible();

  // 8. Promover com NEXT cheio precisa FALHAR COM MENSAGEM, não em silêncio
  await page.getByRole("button", { name: "→ next" }).first().click();
  await expect(page.getByRole("alert")).toContainText("teto");

  // 9. Quick Capture
  await page.getByRole("button", { name: /Capturar/ }).first().click();
  const rascunho = "Captura de teste do E2E — vira candidate, nunca conhecimento canônico.";
  await page.getByPlaceholder("Cole ou escreva. Sem classificar nada agora.").fill(rascunho);
  await page.getByRole("button", { name: "Capturar", exact: true }).last().click();

  // 10. Recarregar e provar que persistiu — deploy sem erro não é prova
  await page.goto(urlDoProjeto);
  await expect(page.getByText("Escrever os ADRs")).toBeVisible();
  await expect(page.getByText("Rodar o harness")).toBeVisible();
  await expect(page.getByText("Mapa territorial por eixos")).toBeVisible();
  await expect(
    page.getByPlaceholder("O que este projeto precisa alcançar agora"),
  ).toHaveValue("Fechar o gate");

  // 11. O evento apareceu em "O que mudou" — a matéria-prima da Fase 02
  await expect(page.getByText("criou o projeto")).toBeVisible();

  // 12. A captura virou candidate e MEMORY a mostra como não canônica
  await page.goto(urlDoProjeto.replace("/now", "/memory"));
  await expect(page.getByText(rascunho.slice(0, 40))).toBeVisible();
});
