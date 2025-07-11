#!/usr/bin/env node
// docs-test.ts
// Traverses the docs/ directory, extracts fenced TypeScript code blocks,
// converts them into temporary Vitest test files, type-checks them with tsc,
// and executes them with Vitest. Exits with a non-zero status on any failure.

/* eslint-disable no-console */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(PROJECT_ROOT, "docs");
const ROOT_README = path.join(PROJECT_ROOT, "README.md");
const OUT_DIR = path.join(PROJECT_ROOT, ".docs-tests");
const TESTS_SUBDIR = path.join(OUT_DIR, "tests");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Recursively collect Markdown file paths inside a directory. */
async function collectMarkdown(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const res = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectMarkdown(res);
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
        return [res];
      return [] as const;
    }),
  );
  return files.flat();
}

/** Extract TypeScript code blocks from a Markdown string. */
function extractTestBlocks(markdown: string): string[] {
  const regex = /```[ \t]*(?:ts|typescript)\b[^\n]*\n([\s\S]*?)```/gim;
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

/** Generate `.test.ts` files directly from docs code blocks. */
async function generateTests(
  docs: Array<{ file: string; blocks: string[] }>,
): Promise<string[]> {
  const generated: string[] = [];
  let counter = 0;

  for (const { file, blocks } of docs) {
    const rel = path.relative(PROJECT_ROOT, file).replace(/[/\\]/g, "-");
    for (const block of blocks) {
      // Phase-4 enforcement: every docs code block must explicitly import vitest and @rybosome/type-a.
      if (!/from\s+["']vitest["']/.test(block)) {
        throw new Error(
          `🚨 Docs code block in ${file} is missing an explicit vitest import`,
        );
      }
      if (!/from\s+["']@rybosome\/type-a["']/.test(block)) {
        throw new Error(
          `🚨 Docs code block in ${file} is missing an explicit @rybosome/type-a import`,
        );
      }

      const filename = `doc-${rel}-${counter++}.test.ts`;
      const filepath = path.join(TESTS_SUBDIR, filename);

      // Phase-2 change: snippets are already *full* Vitest tests – no wrapper
      // or import injection necessary.  We simply write them verbatim so the
      // docs and the executed code stay in perfect sync.
      const content = [
        `/** Auto-generated from ${file.replace(/`/g, "")} */`,
        "",
        block,
        "",
      ].join("\n");

      await fs.writeFile(filepath, content, "utf8");
      generated.push(filepath);
    }
  }

  return generated;
}

/** Generate a Vitest config that scopes the run to the generated tests only. */
async function writeVitestConfig(): Promise<string> {
  const viteConfigPath = path.join(OUT_DIR, "vitest.config.temp.ts");
  const cfg = `import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true, include: ['.docs-tests/tests/**/*.test.ts'] } });\n`;
  await fs.writeFile(viteConfigPath, cfg, "utf8");
  return viteConfigPath;
}

/** Write a tsconfig that adds Vitest globals and includes the generated tests. */
async function writeTsconfig(): Promise<string> {
  const tsconfigPath = path.join(OUT_DIR, "tsconfig.json");
  const tsconfig = {
    extends: path.relative(OUT_DIR, path.join(PROJECT_ROOT, "tsconfig.json")),
    include: ["**/*.ts"],
    compilerOptions: { types: ["vitest/globals"] },
  } as const;
  await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2), "utf8");
  return tsconfigPath;
}

/** Run a shell command inheriting stdio. */
function run(cmd: string): void {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

// ---------------------------------------------------------------------------
// Main driver
// ---------------------------------------------------------------------------

(async () => {
  try {
    const mdFiles: string[] = [];

    // docs directory
    try {
      const stat = await fs.stat(DOCS_DIR);
      if (stat.isDirectory())
        mdFiles.push(...(await collectMarkdown(DOCS_DIR)));
    } catch {
      /* ignore */
    }

    // root README
    try {
      const stat = await fs.stat(ROOT_README);
      if (stat.isFile()) mdFiles.push(ROOT_README);
    } catch {
      /* ignore */
    }

    if (mdFiles.length === 0) {
      console.warn("No markdown files found – skipping docs tests.");
      process.exit(0);
    }

    const docsWithBlocks: Array<{ file: string; blocks: string[] }> = [];
    for (const file of mdFiles) {
      const src = await fs.readFile(file, "utf8");
      const blocks = extractTestBlocks(src);
      if (blocks.length) docsWithBlocks.push({ file, blocks });
    }

    if (docsWithBlocks.length === 0) {
      console.log("No TypeScript code blocks found – skipping docs tests.");
      process.exit(0);
    }

    await prepareOutDir();
    await generateTests(docsWithBlocks);
    const tsconfigPath = await writeTsconfig();
    const vitestConfigPath = await writeVitestConfig();

    run(`pnpm exec tsc -p ${tsconfigPath} --noEmit`);
    run("pnpm run build");
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
