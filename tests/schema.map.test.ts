/**
 * Record<X, Y> and Map<X, Y> support tests.
 *
 * These checks cover both simple and recursively-nested collection cases to
 * ensure the Schema machinery correctly preserves runtime structures and
 * enforces compile-time typing.
 */

import { describe, it, expect } from "vitest";
import { Schema, Of, one } from "@rybosome/type-a";

/* -------------------------------------------------------------------------- */
/*  Simple Record & Map fields                                                */
/* -------------------------------------------------------------------------- */

class SimpleMaps extends Schema.from({
  // Plain JS object with string keys/values
  meta: Of<one, Record<string, string>>({}),

  // Runtime Map with numeric keys and boolean values
  flags: Of<one, Map<number, boolean>>({}),
}) {}

/* -------------------------------------------------------------------------- */
/*  Nested Record<Record<…>>                                                  */
/* -------------------------------------------------------------------------- */

class NestedRecords extends Schema.from({
  dict: Of<one, Record<string, Record<string, string>>>({}),
}) {}

/* -------------------------------------------------------------------------- */
/*  Nested Map<Map<…>>                                                        */
/* -------------------------------------------------------------------------- */

class NestedMaps extends Schema.from({
  nested: Of<one, Map<string, Map<string, number>>>({}),
}) {}

/* -------------------------------------------------------------------------- */
/*  Mixed Record<Map<…>>                                                      */
/* -------------------------------------------------------------------------- */

class MixedNested extends Schema.from({
  mixed: Of<one, Record<string, Map<number, string>>>({}),
}) {}

/* -------------------------------------------------------------------------- */
/*  Runtime behaviour                                                         */
/* -------------------------------------------------------------------------- */

describe("Schema record & map support", () => {
  it("supports simple Record and Map fields", () => {
    const instance = new SimpleMaps({
      meta: { hello: "world" },
      flags: new Map<number, boolean>([
        [1, true],
        [2, false],
      ]),
    });

    // Record field (plain object)
    expect(instance.meta).toEqual({ hello: "world" });
    expect(instance.meta.hello).toBe("world");

    // Map field
    expect(instance.flags).toBeInstanceOf(Map);
    expect(instance.flags.get(1)).toBe(true);
  });

  it("supports nested Record<Record<…>> fields", () => {
    const instance = new NestedRecords({
      dict: { outer: { inner: "value" } },
    });

    expect(instance.dict.outer.inner).toBe("value");
  });

  it("supports nested Map<Map<…>> fields", () => {
    const inner1 = new Map<string, number>([["a", 1]]);
    const inner2 = new Map<string, number>([["b", 2]]);

    const instance = new NestedMaps({
      nested: new Map<string, Map<string, number>>([
        ["first", inner1],
        ["second", inner2],
      ]),
    });

    expect(instance.nested).toBeInstanceOf(Map);
    expect(instance.nested.get("first")).toBe(inner1);
    expect(instance.nested.get("second")?.get("b")).toBe(2);
  });

  it("supports mixed Record<Map<…>> fields", () => {
    const instance = new MixedNested({
      mixed: {
        section: new Map<number, string>([
          [1, "one"],
          [2, "two"],
        ]),
      },
    });

    const map = instance.mixed.section;
    expect(map).toBeInstanceOf(Map);
    expect(map.get(2)).toBe("two");
  });

  /* ---------------------------------------------------------------------- */
  /*  Compile-time expectations (non-executed)                                */
  /* ---------------------------------------------------------------------- */

  // Invalid Record value type – number not assignable to string
  // @ts-expect-error – intentional compile-time failure
  // prettier-ignore
  void new SimpleMaps({ meta: { key: 123 }, flags: new Map<number, boolean>([[1, true]]) });

  // Invalid Map value type – string not assignable to boolean
  // @ts-expect-error – intentional compile-time failure
  // prettier-ignore
  void new SimpleMaps({ meta: { ok: "yes" }, flags: new Map<number, string>([[1, "bad"]]) });
});
