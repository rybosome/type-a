# type-a

A minimal, class-first validation library for TypeScript — inspired by Python’s Pydantic, but built for the TypeScript ecosystem. Define schema and logic together, with zero decorators, zero codegen, and native field access via classes.

⸻

## ✨ Features

    •	Class-based API with native this.property field access
    •	Schema and validation co-located with class declaration
    •	Type-safe constructor input inference from schema
    •	No decorators, reflect-metadata, or TypeScript hacks
    •	Zero duplication — schema defines both runtime behavior and static types
    •	Lightweight and dependency-free

⸻

## 📦 Installation

NPM: `npm install @rybosome/type-a`
PNPM: `pnpm add @rybosome/type-a`

⸻

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
const goodResult: Maybe<User> = User.tryNew({
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
const badResult: Maybe<User> = User.tryNew({ id: "not a UUID", age: 25 });

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

⸻

## 🔍 Comparison

| Feature                | type-a | Zod | class-validator + transformer | ArkType | Typia |
| ---------------------- | ------ | --- | ----------------------------- | ------- | ----- |
| Class syntax           | ✅     | ❌  | ✅                            | ❌      | ✅    |
| Field access           | ✅     | ✅  | ✅                            | ❌      | ✅    |
| Type-safe input        | ✅     | ✅  | ⚠️ Manual                     | ✅      | ✅    |
| Runtime validation     | ✅     | ✅  | ✅                            | ✅      | ✅    |
| Avoids decorators      | ✅     | ✅  | ❌                            | ✅      | ✅    |
| Avoids code generation | ✅     | ✅  | ✅                            | ✅      | ❌    |

⸻
