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
    // Enable coverage collection and enforce production-ready thresholds.
    coverage: {
      enabled: true,
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
