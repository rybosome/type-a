# Getting Started

Welcome to **Type-A** – a tiny but powerful schema & validation library for TypeScript.
This guide shows how to install the package and run your _first_ schema.

## Installation

With **pnpm** (recommended):

```bash
pnpm add @rybosome/type-a vitest -D   # vitest is used in all docs samples
```

or with **npm**:

```bash
npm install @rybosome/type-a vitest --save-dev
```

## Hello world

The snippet below defines a minimal `User` schema, instantiates it with data, and
runs a validation.

```ts test
import { describe, it, expect } from "vitest";
import { Schema, one, constraints as c, typed as t } from "@rybosome/type-a";

describe("Hello Type-A", () => {
  it("creates and validates a User", () => {
    class User extends Schema.from({
      id: one(t.string, { is: c.nonEmpty }),
      name: one(t.string),
      createdAt: one(t.serdes(Date, t.string), {
        serdes: [(d: Date) => d.toISOString(), (iso: string) => new Date(iso)],
      }),
    }) {}

    const u = new User({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Alice",
      createdAt: "2025-01-01T00:00:00Z",
    });

    expect(u.validate()).toEqual([]); // no errors
  });
});
```

[Run on StackBlitz](https://stackblitz.com/fork/node?file=index.test.ts)

---

Next up: explore the rest of the **API reference** to learn how to model maps,
tuples, nested schemas, and more.
