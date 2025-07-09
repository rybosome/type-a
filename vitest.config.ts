// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    include: ["tests/**/*.test.ts"],
  },
});
