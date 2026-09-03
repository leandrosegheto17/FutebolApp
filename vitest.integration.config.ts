import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Config dedicada a testes de integração que exigem um Supabase local real
 * (`supabase start`, ver `supabase/config.toml`) — ex.: BE-02 (RLS
 * deny-by-default tabela a tabela). Ambiente `node` (não `jsdom`): estes
 * testes fazem chamadas HTTP reais ao PostgREST local, não renderizam
 * componente algum.
 *
 * Uso local: `supabase start` (uma vez) e depois `npm run test:integration`.
 * Não roda no job "Test" do CI compartilhado (`.github/workflows/ci.yml`),
 * que hoje não sobe um Supabase local — nota para o DevOps registrar como
 * follow-up se este pipeline de integração precisar rodar em CI no futuro.
 *
 * `fileParallelism: false` (achado empírico de BE-05, validação manual desta
 * tarefa): todos os arquivos `*.integration.test.ts` apontam para o MESMO
 * Supabase local real (um único Postgres compartilhado, não um banco isolado
 * por arquivo/worker). Enquanto cada arquivo só lia/escrevia tabelas
 * disjuntas (BE-02/03/04), rodar os arquivos em paralelo (padrão do Vitest)
 * nunca expôs problema; a partir de BE-05
 * (`redefinir-senha.integration.test.ts`), dois arquivos passam a escrever
 * concorrentemente na MESMA linha singleton de `app.auth_interno`
 * (`auth.integration.test.ts` também usa/faz upsert dessa linha) — rodando em
 * paralelo, um arquivo pode trocar o hash vigente no meio da execução do
 * outro, quebrando um teste que dependia do hash que ele mesmo acabou de
 * gravar (reproduzido de forma determinística, não é suposição). Arquivos
 * de teste continuam paralelizáveis internamente (`it` dentro do mesmo
 * arquivo já roda em série por padrão do Vitest); só a paralelização ENTRE
 * arquivos é desligada.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.integration.test.ts"],
    setupFiles: ["./vitest.integration.setup.ts"],
    testTimeout: 20_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
