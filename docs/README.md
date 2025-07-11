# Type-A Documentation Examples

This repository uses **Type-A** for schema validation. The snippet below is a **live test** – it is compiled and executed by `pnpm docs:test` to guarantee the example remains correct and type-safe.

```ts test
import { describe, it, expect } from "vitest";
import { Schema, one, typed as t } from "@rybosome/type-a";

describe("User schema basics", () => {
  it("constructs and exposes validated fields", () => {
    class User extends Schema.from({
      name: one(t.string),
      age: one(t.number),
    }) {}

    const u = new User({ name: "Alice", age: 42 });

    expect(u.name).toBe("Alice");
    expect(u.age).toBe(42);
  });
});
```

If the snippet above fails to compile or its assertions fail, the documentation tests will fail in CI, alerting us that the example needs to be updated.
