#!/usr/bin/env node
// docs-test.ts
// Traverses the docs/ directory, extracts fenced `typescript test` blocks, converts
// them into temporary Vitest test files, type-checks them with tsc, and executes
// them with Vitest. Exits with a non-zero status on any failure.

/* eslint-disable no-console */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PROJECT_ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(PROJECT_ROOT, "docs");
const OUT_DIR = path.join(PROJECT_ROOT, ".docs-tests");
const TESTS_SUBDIR = path.join(OUT_DIR, "tests");

// Helpers

/** Recursively collect Markdown file paths inside a directory. */
async function collectMarkdown(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const res = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectMarkdown(res);
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        return [res];
      }
      return [] as const;
    }),
  );
  return files.flat();
}

/**
 * Extract TypeScript code blocks tagged with `test` from a Markdown string.
 * Returns an array of code block strings.
 */
function extractTestBlocks(markdown: string): string[] {
  /*
   * Regex breakdown:
   * ```                 opening fence
   * (?:ts|typescript)   language tag (ts|typescript)
   * [\t ]+test          at least one whitespace then the word test
   * [^\n]*              ignore everything until newline (handles attrs)
   * ([\s\S]*?)         lazily capture everything until the closing fence
   * ```                 closing fence
   */
  const regex = /```(?:ts|typescript)[\t ]+test[^\n]*\n([\s\S]*?)```/gim;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push(match[1].trimEnd());
  }
  return blocks;
}

/** Prepare the output directory (clean + recreate). */
async function prepareOutDir(): Promise<void> {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(TESTS_SUBDIR, { recursive: true });
}

/**
 * Generate `.test.ts` files from extracted code blocks.
 * Returns the array of generated file paths.
 */
async function generateTests(
  docs: Array<{ file: string; blocks: string[] }>,
): Promise<string[]> {
  const generated: string[] = [];
  let counter = 0;

  for (const { file, blocks } of docs) {
    const rel = path.relative(PROJECT_ROOT, file).replace(/[/\\]/g, "-");
    for (const block of blocks) {
      const filename = `doc-${rel}-${counter++}.test.ts`;
      const filepath = path.join(TESTS_SUBDIR, filename);

      const lines = block.split("\n");

      // Separate import lines (while preserving their original order) so they can be hoisted.
      const importLines: string[] = [];
      const bodyLines: string[] = [];

      for (const line of lines) {
        if (/^\s*import\s/.test(line)) {
          importLines.push(line);
        } else {
          bodyLines.push(line);
        }
      }

      const content = [
        "import { describe, it, expect } from 'vitest';",
        ...importLines,
        "",
        `/** Auto-generated from ${file.replace(/`/g, "")} */`,
        "",
        "describe('documentation snippet', () => {",
        "  it('executes without throwing', () => {",
        ...bodyLines.map((l) => `    ${l}`),
        "  });",
        "});",
        "",
      ].join("\n");

      await fs.writeFile(filepath, content, "utf8");
      generated.push(filepath);
    }
  }

  return generated;
}

/**
 * Generate a minimal Vitest config that points `test.include` to the generated
 * tests directory so we don't interfere with the project's main test suite.
 */
async function writeVitestConfig(): Promise<string> {
  const viteConfigPath = path.join(OUT_DIR, "vitest.config.temp.ts");
  const cfg = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['.docs-tests/tests/**/*.test.ts'],
  },
});
`;
  await fs.writeFile(viteConfigPath, cfg, "utf8");
  return viteConfigPath;
}

/**
 * Write a minimal tsconfig that extends the project tsconfig and includes the
 * generated tests.
 */
async function writeTsconfig(): Promise<string> {
  const tsconfigPath = path.join(OUT_DIR, "tsconfig.json");
  const tsconfig = {
    extends: path.relative(OUT_DIR, path.join(PROJECT_ROOT, "tsconfig.json")),
    include: ["**/*.ts"],
    compilerOptions: {
      types: ["vitest/globals"],
    },
  } as const;
  await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2), "utf8");
  return tsconfigPath;
}

/** Run a shell command inheriting stdio. */
function run(cmd: string): void {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

// Main driver

(async () => {
  try {
    // 1. Guard against missing docs directory.
    try {
      await fs.access(DOCS_DIR);
    } catch {
      console.warn("No docs directory found - skipping docs tests.");
      process.exit(0);
    }

    // 2. Collect markdown files.
    const mdFiles = await collectMarkdown(DOCS_DIR);
    if (mdFiles.length === 0) {
      console.warn("No markdown files found under docs/. Nothing to test.");
      process.exit(0);
    }

    // 3. Extract code blocks.
    const docsWithBlocks: Array<{ file: string; blocks: string[] }> = [];
    for (const file of mdFiles) {
      const src = await fs.readFile(file, "utf8");
      const blocks = extractTestBlocks(src);
      if (blocks.length) {
        docsWithBlocks.push({ file, blocks });
      }
    }

    if (docsWithBlocks.length === 0) {
      console.log(
        "No `typescript test` code blocks found in docs. Nothing to test.",
      );
      process.exit(0);
    }

    // 4. Prepare output directory.
    await prepareOutDir();

    // 5. Generate test files.
    await generateTests(docsWithBlocks);

    // 6. Write tsconfig for type-checking.
    const tsconfigPath = await writeTsconfig();

    // 7. Generate Vitest config.
    const vitestConfigPath = await writeVitestConfig();

    // 8. Type-check.
    run(`pnpm exec tsc -p ${tsconfigPath} --noEmit`);

    // 9. Build the library so imports resolve correctly.
    run("pnpm run build");

    // 10. Run Vitest on generated tests only.
    run(`pnpm exec vitest run --config ${vitestConfigPath}`);

    console.log("Docs tests passed");
  } catch (err: unknown) {
    console.error(
      "Docs tests failed:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  }
})();
