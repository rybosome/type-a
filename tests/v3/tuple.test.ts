/**
 * Tuple handling tests – v3 runtime (native `t.tuple`).
 */

import { describe, it, expect } from "vitest";

import { Schema } from "../../src/v3/schema";
import { one } from "../../src/v3/field";
import { t } from "../../src/v3/typed";

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

describe("v3 Schema tuple support (native)", () => {
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
