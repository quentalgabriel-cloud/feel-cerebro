import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes de unidade rodam sem Next, sem banco e sem rede — o que dá para
// testar assim é lógica pura, e é exatamente isso que está em `src/lib/*`.
// Autorização e invariantes de domínio NÃO se testam aqui: quem impõe é o
// Postgres, e quem prova é `supabase/tests/verify.sh`. Um teste de unidade
// que "prove" RLS estaria provando o mock.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
