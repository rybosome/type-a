# Primitive Types

Primitive type descriptors live in the `t.*` namespace and include
`string`, `number`, `boolean`, and `bigint`.

```typescript
import { describe, it, expect } from "vitest";
import { Schema, one, constraints as c, typed as t } from "@rybosome/type-a";

describe("Primitive field validation", () => {
  it("guards against empty strings and negative numbers", () => {
    class Product extends Schema.from({
      name: one(t.string, { is: c.nonEmpty }),
      price: one(t.number, { is: c.atLeast(0) }),
    }) {}

    const p = new Product({ name: "Widget", price: 9.99 });
    expect(p.validate()).toEqual([]);
  });
});
```

Use constraints (see [constraints](https://rybosome.github.io/type-a/api/constraints)) to add semantic validation rules on top
of the raw primitive runtime checks.
