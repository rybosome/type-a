/**
 * Tuple and collection handling tests.
 *
 * These checks ensure that both *fixed-length* tuples and *variadic* tuples
 * that include a rest pattern are accepted by the schema type-system and work
 * correctly at runtime.
 */

import { describe, it, expect } from "vitest";
import { Schema, one } from "@rybosome/type-a";

/* -------------------------------------------------------------------------- */
/*  Schema under test                                                         */
/* -------------------------------------------------------------------------- */

class Collections extends Schema.from({
  // Fixed-length tuple – exactly two elements, boolean followed by number
  pair: one().of<[boolean, number]>({}),

  // Variadic tuple – at least one string, followed by zero or more strings
  stringSequence: one().of<[string, ...string[]]>({}),
}) {}

/* -------------------------------------------------------------------------- */
/*  Runtime behaviour                                                         */
/* -------------------------------------------------------------------------- */

describe("Schema tuple support", () => {
  it("accepts and preserves fixed-length tuples", () => {
    const m = new Collections({
      pair: [true, 42],
      stringSequence: ["a"],
    });

    expect(m.pair).toEqual([true, 42]);
    expect(m.pair[0]).toBeTypeOf("boolean");
    expect(m.pair[1]).toBeTypeOf("number");
  });

  it("accepts and preserves variadic tuples with a rest pattern", () => {
    const m = new Collections({
      pair: [false, 0],
      stringSequence: ["first", "second", "third"],
    });

    expect(m.stringSequence.length).toBe(3);
    for (const s of m.stringSequence) expect(s).toBeTypeOf("string");
  });

  /* ---------------------------------------------------------------------- */
  /*  Compile-time expectations (non-executed arrow functions)               */
  /* ---------------------------------------------------------------------- */

  // The blocks below are *never* evaluated at runtime; they exist purely so the
  // TypeScript compiler can verify that incorrect tuple shapes are rejected.

  // -- Fixed-length tuple --------------------------------------------------

  // @ts-expect-error – missing second element
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new Collections({ pair: [true], stringSequence: ["one"] });

  // @ts-expect-error – extra third element not allowed for the fixed pair
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new Collections({ pair: [true, 1, 2], stringSequence: ["one"] });

  // -- Variadic tuple ------------------------------------------------------

  // @ts-expect-error – first (required) element must be a string
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new Collections({ pair: [true, 1], stringSequence: [1] });
});
