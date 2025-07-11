# Quick-start Example

This concise walk-through shows the **minimum** you need to hit the ground
running with **Type-A**: define a schema, create a value, validate, and (optionally)
export a JSON Schema.

## 1 – Install (once per project)

```bash
pnpm add @rybosome/type-a vitest -D
```

## 2 – Write your first schema

```ts
import { describe, it, expect } from "vitest";
import {
  Schema,
  one,
  many,
  typed as t,
  constraints as c,
} from "@rybosome/type-a";

const Roles = { admin: "admin", member: "member" } as const;

// 1. Define the model
class User extends Schema.from({
  id: one(t.string, { is: c.nonEmpty }),
  name: one(t.string),
  email: one(t.string, { is: c.nonEmpty }),
  roles: many(t.enum(Roles), { asSet: true }),
}) {}

describe("Quick-start", () => {
  it("constructs & validates a User instance", () => {
    // 2. Construct – raw JS/JSON is accepted
    const u = new User({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Ryan",
      email: "ryan@example.com",
      roles: new Set(["member"]),
    });

    // 3. Validate – returns an empty array on success
    expect(u.validate()).toEqual([]);

    // 4. Emit JSON Schema (draft-07)
    const js = User.jsonSchema();
    expect(js).toHaveProperty("properties.email.type", "string");
  });
});
```

### Live demo

- [Run in TypeScript Playground](https://www.typescriptlang.org/play?#code=) _(link auto-generated during site build)_
- [Open in StackBlitz](https://stackblitz.com/fork/node?file=index.ts&code=) _(link auto-generated)_

---

Continue with the [**advanced** example](https://rybosome.github.io/type-a/docs/examples/advanced/) to see nested schemas,
maps, and custom serializers in action.
