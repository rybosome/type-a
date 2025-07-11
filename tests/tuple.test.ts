/**
 * Tuple handling tests – `t.tuple`.
 */

import { describe, it, expect } from "vitest";
import { Schema, one, typing as t } from "@rybosome/type-a";

/* -------------------------------------------------------------------------- */
/*  Schema under test                                                         */
/* -------------------------------------------------------------------------- */

class Tuples extends Schema.from({
  // Fixed-length tuple – exactly two elements, boolean followed by number
  pair: one(t.tuple(t.boolean, t.number)),
}) {}

/* -------------------------------------------------------------------------- */
/*  Runtime behaviour                                                         */
/* -------------------------------------------------------------------------- */

describe("Schema tuple support (native)", () => {
  it("accepts and preserves fixed-length tuples", () => {
    const m = new Tuples({
      pair: [true, 42],
    });

    expect(m.pair).toEqual([true, 42]);
    expect(m.pair[0]).toBeTypeOf("boolean");
    expect(m.pair[1]).toBeTypeOf("number");
  });

  /* ---------------------------------------------------------------------- */
  /*  Compile-time expectations (non-executed arrow functions)               */
  /* ---------------------------------------------------------------------- */

  // @ts-expect-error – missing second element
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new Tuples({ pair: [true] });

  // @ts-expect-error – extra third element not allowed for the fixed pair
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new Tuples({ pair: [true, 1, 2] });
});
