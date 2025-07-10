# type-a

<img src="https://github.com/rybosome/type-a/raw/refs/heads/main/docs/assets/anna-adder.png">

## Overview

A minimal, class-first schema library with lightweight reflection for TypeScript.

```typescript
import { Schema, one, constraints as c, typing as t } from "@rybosome/type-a";

class User extends Schema.from({
  id: one(t.string, { is: c.aUUID }),
  age: one(t.number, { is: c.atLeast(0) }),
}) {
  greet() {
    return `Hello! My ID is ${this.id} and I'm ${this.age} years old.`;
  }
}
```

### 📦 Installation

- NPM: `npm install @rybosome/type-a`
- PNPM: `pnpm add @rybosome/type-a`

### ✨ Highlights

- Class-based API with native this.property field access
- Schema and validation co-located with class declaration
- Type-safe constructor input inference from schema
- No decorators or reflect-metadata
- Zero duplication — schema defines both runtime behavior and static types
- Lightweight and dependency-free

### 🔍 Comparison

`type-a` exists within a rich ecosystem of libraries and tools for declarative models. Each offer
various design tradeoffs and areas of focus.

| Feature                | type-a | Zod | class-validator + transformer | ArkType | Typia |
| ---------------------- | ------ | --- | ----------------------------- | ------- | ----- |
| Class syntax           | ✅     | ❌  | ✅                            | ❌      | ✅    |
| Avoids decorators      | ✅     | ✅  | ❌                            | ✅      | ✅    |
| Avoids code generation | ✅     | ✅  | ✅                            | ✅      | ❌    |
| Mature                 | ❌     | ✅  | ✅                            | ✅      | ✅    |

`type-a` may be interesting to developers looking for a light, class-forward model with some
reflective capabilities, without reflective penalties.

## Features

### Standard class initialization and property access

Schema definitions are typical TypeScript classes, instantiate them from `new` with a typed
constructor, then access the properties and call the methods as you'd expect.

```typescript
const u1: User = new User({
  id: "123e4567-e89b-12d3-a456-426614174000",
  age: 30,
});

expect(u1.id instanceof string).toBeTrue();
expect(u1.age instanceof number).toBeTrue();
expect(u1.greet()).toBe(
  "Hello! My ID is 123e4567-e89b-12d3-a456-426614174000 and I'm 30 years old.",
);
```

### Validation

`new` initialization is type-checked at compile-time by TypeScript. For runtime
type-checking and value-checking, there is a `fromJSON` entrypoint.

This returns a `Maybe` value, which will either have your class instance at `.val` or a structured
error log at `.err`.

````typescript
const goodResult: Maybe<User> = User.fromJSON({
  id: "123e4567-e89b-12d3-a456-426614174000",
  age: 30,
});

// This object passes all validation, so the value on the result is defined.
const u2 = goodResult.val!;
expect(u2.greet()).toBe(
  "Hello! My ID is 123e4567-e89b-12d3-a456-426614174000 and I'm 30 years old.",
);

// Try to create a new object that is correctly typed but violates logical constraints.
const badResult: Maybe<User> = User.fromJSON({ id: "not a UUID", age: 25 });

// .errs is an optional structured object containing fields mapping to our original object.
//
// It will be set in this case, because we have passed JSON which violates either type or value
// checking.
const errs = badResult.errs!;

expect(errs.id).toBe("'not a UUID' is not a valid UUID");
expect(errs.age).toBeUndefined();

// .summarize() returns a human readable summary of the problems in the schema
expect(errs.summarize()).toBe(
  ```id: 'not a UUID' is not a valid UUID
name: OK
```,
);
````

### 🔄 Custom serialization / deserialization

Certain complex runtime types (such as `Date`, `URL`, or bespoke domain objects)
don’t have a JSON-compatible representation out-of-the-box. `type-a` lets you
attach a `[serializer, deserializer]` tuple to any field so your models can
seamlessly accept raw JSON values **and** emit fully serialised JSON again –
without additional plumbing code.

```typescript
import { Schema, one, typing as t } from "@rybosome/type-a";

const serializeDate = (d: Date) => d.toISOString();
const deserializeDate = (s: string) => new Date(s);

class Event extends Schema.from({
  title: one(t.string),
  when: one(t.serdes(Date, t.string), {
    serdes: [serializeDate, deserializeDate],
  }),
}) {}

// Accepts ISO-8601 strings (raw JSON) …
const e = new Event({ title: "Launch", when: "2025-12-31T23:59:59.000Z" });

// …but exposes a fully-typed Date instance at runtime
e.when instanceof Date; // → true

// `toJSON()` automatically applies the serializer
JSON.stringify(e); // { "title": "Launch", "when": "2025-12-31T23:59:59.000Z" }
```

Both functions must form an exact inverse pair – the serializer is typed as
`(value: T) => Raw` while the deserializer is `(value: Raw) => T`. Supplying a
mismatched pair will fail at compile-time.

### JSON Schema Generation

Generate JSON schema documents at runtime for your class definitions.

```typescript
// TODO: example of JSON schema generation.
```

## Documentation

TODO: document links to...

- entrypoints: one/many
- types in typing
  - primitives
  - tuples, unions, variants
  - maps
  - nested schemas
- config options
  - constraints
  - serdes
- examples
