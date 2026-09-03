import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: true,
    // Testes de integração (`*.integration.test.ts`, ex.: BE-02 RLS
    // tabela-a-tabela) exigem um Supabase local rodando (`supabase start`) e
    // não devem participar do `npm test` padrão usado pelo job "Test" do CI
    // compartilhado (.github/workflows/ci.yml), que não sobe banco algum —
    // ver `vitest.integration.config.ts` e o script `test:integration`.
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
