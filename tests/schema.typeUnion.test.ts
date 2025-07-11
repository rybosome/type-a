/**
 * Legacy path wrapper – updated to v3 runtime.  Mirrors tests in
 * `tests/v3/union_variant.test.ts` so downstream tooling that expects this
 * filename continues to pass.
 */

import { describe, it, expect } from "vitest";

import { Schema } from "@src/schema";
import { one } from "@src/field";
import { t } from "@src/typed";

class CoordA extends Schema.from({
  x: one(t.number),
}) {}

class CoordB extends Schema.from({
  y: one(t.number),
}) {}

class Shape extends Schema.from({
  coord: one(t.union([CoordA, CoordB])),
}) {}

describe("Schema Union type support (v3)", () => {
  it("constructs with valid union values", () => {
    const success = new Shape({ coord: { x: 1 } });
    expect(success.coord).toBeInstanceOf(CoordA);

    const failure = new Shape({ coord: { y: 2 } });
    expect(failure.coord).toBeInstanceOf(CoordB);
  });

  it("produces no validation errors for valid inputs", () => {
    const res = Shape.fromJSON({ coord: { x: 0 } });
    expect(res.errs).toBeUndefined();
    expect(res.val?.coord).toBeInstanceOf(CoordA);
  });

  /* -------------------------------------------------------------- */
  /* Invalid inputs (compile-time expectations)                      */
  /* -------------------------------------------------------------- */

  // @ts-expect-error – boolean is outside the allowed union
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new Shape({ coord: true });

  // @ts-expect-error – missing required property
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new Shape({ coord: { z: 1 } });
});
