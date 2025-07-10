# type-a

<img src="https://github.com/rybosome/type-a/raw/refs/heads/main/docs/assets/anna-adder.png">

A minimal, class-first validation library for TypeScript — inspired by Python’s Pydantic, but built for the TypeScript ecosystem. Define schema and logic together, with zero decorators, zero codegen, and native field access via classes.

## ✨ Features

- Class-based API with native this.property field access
- Schema and validation co-located with class declaration
- Type-safe constructor input inference from schema
- No decorators, reflect-metadata, or TypeScript hacks
- Zero duplication — schema defines both runtime behavior and static types
- Lightweight and dependency-free

## 📦 Installation

- NPM: `npm install @rybosome/type-a`
- PNPM: `pnpm add @rybosome/type-a`

## 🚀 Quick Start

```typescript
import { Maybe, Of, Schema, atLeast, aUUID } from "@rybosome/type-a";

//
// Define a schema expressing typing and input shape expectations
//

class User extends Schema.from({
  id: Of<string>({ is: aUUID }),
  age: Of<number>({ is: atLeast(0) }),
}) {
  greet() {
    return `Hello! My ID is ${this.id} and I'm ${this.age} years old.`;
  }
}

//
// Instantiating schema models - success
//

// Try to create a new object from the given (statically-typed) input.
const goodResult: Maybe<User> = User.fromJSON({
  id: "123e4567-e89b-12d3-a456-426614174000",
  age: 30,
});

// This object passes all validation, so the value on the result is defined.
if (goodResult.val) {
  const u: User = goodResult.val;
  console.log(u.greet()); // Hello! My ID is 123e4567-e89b-12d3-a456-426614174000 and I'm 30 years old.
}

//
// Instantiating schema models - failure
//

// Try to create a new object that is correctly typed but violates logical constraints.
const badResult: Maybe<User> = User.fromJSON({ id: "not a UUID", age: 25 });

// .errs is a structured object containing fields mapping to our original object.
if (badResult.errs) {
  // The .id field of the error log should be set
  console.log(badResult.errs?.id ?? "id is OK"); // Prints "'not a UUID' is not a valid UUID"

  // The .age field of the error log should NOT be set
  console.log(badResult.errs?.name ?? "name is OK"); // Prints "name is OK"

  // We can summarize all problems with the input.
  console.log(badResult.errs?.summarize());

  // Prints the following:
  //  id: 'not a UUID' is not a valid UUID
  //  name: OK
}
```

## 🗂️ Nested schemas & array helpers

`Of()` now accepts a Schema class (or an array form) **plus** additional field options.
Passing a plain object — or an array of plain objects — automatically instantiates the
corresponding nested schema class(es).

```ts
const isValidLogin = (val: LoginAttempt) =>
  val.unixTimestampMs >= 0 || "timestamp must be positive";

class LoginAttempt extends Schema.from({
  success: Of<boolean>(),
  unixTimestampMs: Of<number>(),
}) {}

class User extends Schema.from({
  // Array-of-schema with custom validator – note the `[LoginAttempt]` wrapper
  loginAttempts: Of([LoginAttempt], { is: isValidLogin }),
}) {}

// Raw object(s) are converted to `LoginAttempt` instances automatically
const u = new User({
  loginAttempts: [
    { success: true, unixTimestampMs: 100 },
    { success: false, unixTimestampMs: 200 },
  ],
});

console.log(u.loginAttempts[0] instanceof LoginAttempt); // true
```

## 🔄 Custom serialization / deserialization

Certain complex runtime types (such as `Date`, `URL`, or bespoke domain objects)
don’t have a JSON-compatible representation out-of-the-box. `type-a` lets you
attach a `[serializer, deserializer]` tuple to any field so your models can
seamlessly accept raw JSON values **and** emit fully serialised JSON again –
without additional plumbing code.

```typescript
import { Schema, Of } from "@rybosome/type-a";

const serializeDate = (d: Date) => d.toISOString();
const deserializeDate = (s: string) => new Date(s);

class Event extends Schema.from({
  title: Of<string>(),
  when: Of<Date>({ serdes: [serializeDate, deserializeDate] }),
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

## 🔍 Comparison

| Feature                | type-a | Zod | class-validator + transformer | ArkType | Typia |
| ---------------------- | ------ | --- | ----------------------------- | ------- | ----- |
| Class syntax           | ✅     | ❌  | ✅                            | ❌      | ✅    |
| Field access           | ✅     | ✅  | ✅                            | ❌      | ✅    |
| Type-safe input        | ✅     | ✅  | ⚠️ Manual                     | ✅      | ✅    |
| Runtime validation     | ✅     | ✅  | ✅                            | ✅      | ✅    |
| Avoids decorators      | ✅     | ✅  | ❌                            | ✅      | ✅    |
| Avoids code generation | ✅     | ✅  | ✅                            | ✅      | ❌    |

```

```
