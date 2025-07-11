#!/usr/bin/env node
/*
 * docs-link.ts – Generates shareable links for TypeScript Playground and
 * StackBlitz WebContainer projects based on one or more `.ts` source files.
 *
 * Usage:
 *   pnpm exec tsx scripts/docs-link.ts path/to/example.ts
 *
 * The script prints two markdown-ready links:
 *   • TS Playground – embeds the entire source in the URL hash
 *   • StackBlitz  – forks the official Node starter and opens the file
 *
 * Note: The StackBlitz link strategy is “good enough” for Phase 4. It forks
 *       the Node template and simply opens `/index.ts` with the provided code
 *       pre-filled via the `&code` query param (supported by WebContainers).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Quick & dirty LZ-based compression used by TS Playground links. */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const lzstring = require("lz-string");

function encodePlayground(code: string): string {
  const compressed = lzstring.compressToEncodedURIComponent(code);
  return `https://www.typescriptlang.org/play?#code=${compressed}`;
}

function encodeStackBlitz(code: string): string {
  // The StackBlitz /fork endpoint accepts a `code` param when the template is
  // “node”.  The editor opens with `/index.ts` pre-populated.
  return `https://stackblitz.com/fork/node?file=index.ts&code=${encodeURIComponent(
    code,
  )}`;
}

function main(): void {
  const [, , ...files] = process.argv;
  if (files.length === 0) {
    console.error("Usage: docs-link <file.ts> [another.ts…]");
    process.exit(1);
  }

  for (const f of files) {
    const abs = resolve(f);
    const code = readFileSync(abs, "utf8");
    console.log(`\n### ${abs}`);
    console.log(`Playground: ${encodePlayground(code)}`);
    console.log(`StackBlitz: ${encodeStackBlitz(code)}`);
  }
}

main();
