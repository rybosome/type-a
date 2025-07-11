# type-a

<p align="center">
  <img src="https://rybosome.github.io/type-a/assets/anna-adder.png" alt="Anna Adder – project mascot" />
</p>

## Overview

A minimal, class-first schema library with lightweight reflection for TypeScript.

```typescript
import { describe, it, expect } from "vitest";
import { Schema, one, constraints as c, typing as t } from "@rybosome/type-a";

class User extends Schema.from({
  id: one(t.string, { is: c.aUUID }),
  age: one(t.number, { is: c.atLeast(0) }),
}) {
  greet() {
    return `Hello! My ID is ${this.id} and I'm ${this.age} years old.`;
  }
}

describe("README hero example", () => {
  it("initialises and greets", () => {
    const u = new User({
      id: "550e8400-e29b-41d4-a716-446655440000",
      age: 42,
    });

    expect(u.greet()).toBe(
      "Hello! My ID is 550e8400-e29b-41d4-a716-446655440000 and I'm 42 years old.",
    );
  });
});
```

### 📦 Installation

- npm: `npm install @rybosome/type-a`
- pnpm: `pnpm add @rybosome/type-a`

### ✨ Highlights

- Class-based API with native `this.property` access
- Schema and validation co-located with the class definition
- Type-safe constructor inference
- No decorators or `reflect-metadata`
- Zero duplication — the schema drives both runtime behaviour _and_ static types
- Lightweight and dependency-free

### 🔍 Comparison

`type-a` lives in a rich ecosystem of declarative model libraries, each with its
own trade-offs:

| Feature                | type-a | Zod | class-validator + transformer | ArkType | Typia |
| ---------------------- | :----: | :-: | :---------------------------: | :-----: | :---: |
| Class syntax           |   ✅   | ❌  |              ✅               |   ❌    |  ✅   |
| Avoids decorators      |   ✅   | ✅  |              ❌               |   ✅    |  ✅   |
| Avoids code generation |   ✅   | ✅  |              ✅               |   ✅    |  ❌   |
| Mature                 |   ❌   | ✅  |              ✅               |   ✅    |  ✅   |

`type-a` is interesting if you want a lean, class-centric model with some
reflection but without decorator overhead.

## Features

Code blocks below are [real tests](https://github.com/rybosome/type-a/blob/main/scripts/docs-test.ts),
executed and type-checked with CI to make sure they remain correct and valid.

### Standard class usage

```typescript
import { describe, it, expect } from "vitest";

import { Schema, one, constraints as c, typing as t } from "@rybosome/type-a";

class User extends Schema.from({
  id: one(t.string, { is: c.aUUID }),
  age: one(t.number, { is: c.atLeast(0) }),
}) {
  greet() {
    return `Hello! My ID is ${this.id} and I'm ${this.age} years old.`;
  }
}
describe("Standard class usage", () => {
  it("constructs and accesses properties", () => {
    const u1 = new User({
      id: "550e8400-e29b-41d4-a716-446655440000",
      age: 30,
    });

    expect(typeof u1.id).toBe("string");
    expect(typeof u1.age).toBe("number");
    expect(u1.greet()).toBe(
      "Hello! My ID is 550e8400-e29b-41d4-a716-446655440000 and I'm 30 years old.",
    );
  });
});
```

### Validation

`new` construction is statically type-checked by TypeScript. For runtime
validation there is a `fromJSON` entry-point which returns a `Maybe` — either
the fully-typed value at `.val` or a structured error log at `.errs`.

```typescript
import { describe, it, expect } from "vitest";

import { Schema, one, constraints as c, typing as t } from "@rybosome/type-a";

class User extends Schema.from({
  id: one(t.string, { is: c.aUUID }),
  age: one(t.number, { is: c.atLeast(0) }),
}) {
  greet() {
    return `Hello! My ID is ${this.id} and I'm ${this.age} years old.`;
  }
}
describe("Runtime validation", () => {
  it("returns structured errors", () => {
    const goodResult = User.fromJSON({
      id: "550e8400-e29b-41d4-a716-446655440000",
      age: 30,
    });

    expect(goodResult.val).toBeDefined();
    expect(goodResult.errs).toBeUndefined();

    const badResult = User.fromJSON({ id: "not a UUID", age: 25 });
    expect(badResult.val).toBeUndefined();
    expect(badResult.errs).toBeDefined();

    const errs = badResult.errs!;

    expect(errs.id).toBe("Invalid UUID");
    expect(errs.age).toBeUndefined();
    expect(errs.summarize()).toEqual(["id: Invalid UUID"]);
  });
});
```

### 🔄 Custom serialization / deserialization

```typescript
import { describe, it, expect } from "vitest";
import { Schema, one, typing as t } from "@rybosome/type-a";

class Event extends Schema.from({
  title: one(t.string),
  when: one(t.serdes(Date, t.string), {
    serdes: [
      (d: Date) => d.toISOString(), // serialize: convert from in-memory -> raw
      (s: string) => new Date(s), // deserialize: convert from raw -> in-memory
    ],
  }),
}) {}

describe("Custom serdes", () => {
  it("round-trips Dates transparently", () => {
    const e = new Event({
      title: "Launch",
      when: "2025-12-31T23:59:59.000Z",
    });

    expect(e.when).toBeInstanceOf(Date);
    expect(JSON.parse(JSON.stringify(e)).when).toBe("2025-12-31T23:59:59.000Z");
  });
});
```

### JSON Schema generation

Returns a [JSON-Schema Draft-07](https://json-schema.org/) representation of the class.

```typescript
import { describe, it, expect } from "vitest";
import { Schema, many, one, typing as t } from "@rybosome/type-a";

class Product extends Schema.from({
  name: one(t.string),
  price: one(t.number),
  tags: many(t.string, { optional: true }),
}) {}

describe("JSON Schema generation", () => {
  it("emits draft-07 schema", () => {
    expect(Product.jsonSchema()).toEqual({
      properties: {
        name: {
          type: "string",
        },
        price: {
          type: "number",
        },
        tags: {
          items: {
            type: "string",
          },
          type: "array",
        },
      },
      required: ["name", "price"],
      type: "object",
    });
  });
});
```

## Documentation

### Guides

- [Getting started](https://rybosome.github.io/type-a/getting-started)
- [Supported types](https://rybosome.github.io/type-a/supported_types)

### API reference

- [Entrypoints (`one` / `many`)](https://rybosome.github.io/type-a/api/entrypoints)
- [Primitive types](https://rybosome.github.io/type-a/api/primitives)
- [Tuples, unions & variants](https://rybosome.github.io/type-a/api/tuples-unions-variants)
- [Maps](https://rybosome.github.io/type-a/api/maps)
- [Nested schemas](https://rybosome.github.io/type-a/api/nested-schemas)
- [Config options](https://rybosome.github.io/type-a/api/config-options)
- [Constraints](https://rybosome.github.io/type-a/api/constraints)
- [Serdes](https://rybosome.github.io/type-a/api/serdes)
