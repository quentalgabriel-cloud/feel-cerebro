import { defineConfig, devices } from "@playwright/test";

// O E2E da Fase 01 (item 25 do plano mestre) escreve dado de verdade: cria
// projeto, define NOW, captura. Por isso ele NÃO roda sozinho.
//
// Rodar isso contra o banco de produção sujaria `events` — que é justamente a
// matéria-prima que a Fase 02 vai medir (TTRC antes/depois). Um projeto de
// teste no meio dos eventos reais contamina a medida que a fase seguinte
// existe para fazer. Então: sem `E2E_BASE_URL` e credenciais no ambiente, a
// suíte inteira é pulada, e o `test:e2e` sai verde sem ter rodado nada.
//
// Para rodar de propósito, contra uma instância descartável:
//   E2E_BASE_URL=http://localhost:3000 \
//   E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
const baseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: baseURL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // O container já traz Chromium; baixar de novo é desperdício.
        launchOptions: process.env.PLAYWRIGHT_BROWSERS_PATH
          ? {}
          : { channel: "chromium" },
      },
    },
  ],
});
