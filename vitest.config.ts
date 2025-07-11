import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  // Allow "@src/*" path alias resolution in Vitest runtime.
  resolve: {
    alias: {
      "@src": resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    passWithNoTests: true,
    include: ["tests/**/*.test.ts"],
  },
});
