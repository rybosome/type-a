# Configuration & JSON-Schema Generation

Every field accepts _options_ that tweak optionality, nullability, default
values, constraints, serialization functions (serdes), and more. In addition,
calling `MySchema.jsonSchema()` returns an [JSON-Schema Draft-07](https://json-schema.org/) representation of the class that is fully
compatible with popular validators like AJV.

```typescript
import { describe, it, expect } from "vitest";
import { Schema, one, typed as t } from "@rybosome/type-a";

describe("jsonSchema() output", () => {
  it("matches the expected shape", () => {
    class User extends Schema.from({
      id: one(t.string, { described: "UUID v4" }),
      age: one(t.number, { optional: true }),
    }) {}

    const js = User.jsonSchema();
    expect(js).toHaveProperty("properties.id.type", "string");
    expect(js).toHaveProperty("properties.age.type", "number");
  });
});
```

See the other API pages for detailed explanations of each option category.
