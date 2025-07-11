# Authoring Code Samples

> **Audience:** Documentation contributors — this guide explains the _rules_ for fenced
> TypeScript blocks and how to attach “live code” playground links.

All TypeScript blocks in `docs/` are _compiled & executed_ by `pnpm docs:test`. A
CI failure means a snippet is broken. Follow the checklist below and you’ll
never break the build.

## 1. Fenced-block checklist

- Use `ts` (or `typescript`) as the language tag **plus** the `test` flag:

  ````
  ```ts
  ````

- Add _both_ import lines _exactly_ as shown — additional named imports are OK
  as long as they come from public packages (no `@src/*` aliases):

  ```ts
  import { describe, it, expect } from "vitest";
  import { one, many, Schema } from "@rybosome/type-a";
  ```

- One **top-level** `describe()` per snippet — nest `it()` calls inside it.
- ≤ 30 lines total (blank lines count). Prefer multiple small blocks over one
  huge example.
- The snippet must run in **strict** TypeScript 5.8 (CI enforces this).

## 2. TypeScript Playground links (type-level demos)

Use the Playground for pure type-system explorations that don’t require
`vitest`. Generate a share URL in the editor, then embed it like so:

```md
[Play](https://www.typescriptlang.org/play?#code=YOUR_ENCODED_CODE)
```

Tips:

1. Strip comments & newlines before encoding — shorter URLs are kinder to
   Markdown line-wrapping.
2. Leave the in-page snippet _unchanged_. The link is purely an optional
   convenience for readers.

### Quick generator (Node):

```bash
node -e "const s=encodeURIComponent(require('fs').readFileSync(0,'utf8')); console.log(s);" < src.ts
```

## 3. StackBlitz WebContainers (runtime demos)

When you want readers to _execute_ the sample in the browser, StackBlitz’
WebContainer platform gives you a full Node + Vitest environment.

1. Go to <https://stackblitz.com/> → **Create ➜ Node Project**.
2. Add `vitest` + `@rybosome/type-a` to `package.json`.
3. Drop your code into `index.test.ts` and run `vitest` inside the terminal to
   verify.
4. Click **Share ➜ Embed** and copy the _URL variant_ (the iframe snippet often
   breaks on static site generators).

Embed the link in Markdown like this:

```md
[Run on StackBlitz](https://stackblitz.com/edit/node-abcdef?file=index.test.ts)
```

(Optional) If you really want an inline iframe, wrap it in HTML so Markdown
parsers don’t mangle the attributes:

```html
<iframe
  src="https://stackblitz.com/edit/node-abcdef?embed=1&file=index.test.ts"
  title="Live demo"
  style="width:100%;height:500px;"
></iframe>
```

---

Following these rules keeps the documentation _self-verifying_ and makes it
a breeze for readers to tinker with the examples.
