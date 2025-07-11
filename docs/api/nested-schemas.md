# Nested Schemas

Schemas can be nested by referencing another `Schema`-derived class directly in
the field descriptor.

```ts test
import { describe, it, expect } from "vitest";
import { Schema, one, typed as t } from "@rybosome/type-a";

describe("Nested schema fields", () => {
  it("performs deep validation", () => {
    class Address extends Schema.from({
      street: one(t.string),
      zip: one(t.string),
    }) {}

    class User extends Schema.from({
      name: one(t.string),
      address: one(Address),
    }) {}

    const u = new User({
      name: "Ada",
      address: { street: "42 Main", zip: "12345" },
    });

    expect(u.address.street).toBe("42 Main");
  });
});
```

> The nested `Address` instance is constructed automatically – no manual
> instantiation required.
