# Entry-points: `one()` & `many()`

`one()` and `many()` are the two _entry-point_ helpers you will use to declare
fields inside every **Type-A** schema. They wrap a **type descriptor** (`t.*`) and
optionally accept field-level options (defaults, constraints, etc.).

- **`one()`** – declares a _single_ value (scalar) field.
- **`many()`** – declares an _ordered collection_ (`Array` or `Set`), depending
  on the runtime input.

```typescript
import { describe, it, expect } from "vitest";
import { Schema, one, many, typed as t } from "@rybosome/type-a";

describe("one() vs many()", () => {
  it("creates both scalar and collection fields", () => {
    class TagList extends Schema.from({
      owner: one(t.string),
      tags: many(t.string),
    }) {}

    const list = new TagList({ owner: "ryan", tags: ["a", "b", "c"] });
    expect(list.owner).toBe("ryan");
    expect(list.tags.length).toBe(3);
  });
});
```

> Each call to `one()` / `many()` returns a _builder object_ that the schema
> compiler consumes at class-definition time – no decorators or runtime
> reflection required.
