import { describe, it, expect } from "vitest";

import { Schema, Of, DiscriminatedUnion } from "@rybosome/type-a";

// Compile-time note: While the following is *syntactically* allowed it offers
// no automatic re-hydration.  Explicit `schemaClasses` should be used instead.
// eslint-disable-next-line @typescript-eslint/no-unused-vars @typescript-eslint/no-empty-function
Of<A | B>();

// ---------------------------------------------------------------------------
// Sub-schemas used in the union
// ---------------------------------------------------------------------------

class A extends Schema.from({
  kind: Of<"A">(),
  a: Of<string>(),
}) {}

class B extends Schema.from({
  kind: Of<"B">(),
  b: Of<number>(),
}) {}

class C extends Schema.from({
  kind: Of<"C">(),
  c: Of<boolean>(),
}) {}

// ---------------------------------------------------------------------------
// Parent schema containing a discriminated union field
// ---------------------------------------------------------------------------

class Thing extends Schema.from({
  subtype: Of<DiscriminatedUnion<[typeof A, typeof B, typeof C]>>({
    schemaClasses: [A, B, C],
  }),
}) {}

class ThingList extends Schema.from({
  list: Of<DiscriminatedUnion<[typeof A, typeof B]>[]>({
    schemaClasses: [A, B],
  }),
}) {}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DiscriminatedUnion", () => {
  it("instantiates the correct subtype based on discriminator", () => {
    const tA = new Thing({ subtype: { kind: "A", a: "alpha" } });
    expect(tA.subtype).toBeInstanceOf(A);
    expect((tA.subtype as A).a).toBe("alpha");

    const tB = new Thing({ subtype: { kind: "B", b: 123 } });
    expect(tB.subtype).toBeInstanceOf(B);
    expect((tB.subtype as B).b).toBe(123);
  });

  it("handles arrays of discriminated values", () => {
    const coll = new ThingList({
      list: [
        { kind: "A", a: "first" },
        { kind: "B", b: 7 },
      ],
    });

    expect(coll.list[0]).toBeInstanceOf(A);
    expect(coll.list[1]).toBeInstanceOf(B);

    const json = coll.toJSON();
    expect(json).toEqual({
      list: [
        { kind: "A", a: "first" },
        { kind: "B", b: 7 },
      ],
    });
  });
});
