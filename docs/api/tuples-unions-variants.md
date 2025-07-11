# Tuples, Unions & Variants

Type-A supports complex composite types through a family of descriptors:

- **`t.tuple(A, B, C)`** – fixed-length, positional arrays.
- **`t.union(A, B)`** – compile-time union with runtime discriminator.
- **`t.variant({ kind: T.literal("a"), ... })`** – tagged unions (a.k.a. algebraic variants).

```ts test
import { describe, it, expect } from "vitest";
import { Schema, one, typed as t } from "@rybosome/type-a";

describe("Tuple and union fields", () => {
  it("accepts a tuple and a strict union", () => {
    class CoordX extends Schema.from({ x: one(t.number) }) {}
    class CoordY extends Schema.from({ y: one(t.number) }) {}

    class Shape extends Schema.from({
      point: one(t.tuple(t.number, t.number)),
      coord: one(t.union([CoordX, CoordY])),
    }) {}

    const s = new Shape({ point: [1, 2], coord: { x: 1 } });
    expect(s.coord).toBeInstanceOf(CoordX);
  });
});
```

The `variant` helper builds on top of `union` and is covered in [nested schemas](https://rybosome.github.io/type-a/api/nested-schemas/).
