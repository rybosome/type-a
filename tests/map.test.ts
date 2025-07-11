/**
 * Record / Map support via `t.map`
 */

import { describe, it, expect } from "vitest";
import { Schema, one, typing as t } from "@rybosome/type-a";

/* -------------------------------------------------------------------------- */
/*  Simple Record & Map fields (compile-time sees Record<…>)                  */
/* -------------------------------------------------------------------------- */

class SimpleMaps extends Schema.from({
  meta: one(t.map(t.string, t.string)),
  flags: one(t.map(t.number, t.boolean)),
}) {}

/* -------------------------------------------------------------------------- */
/*  Nested structures                                                         */
/* -------------------------------------------------------------------------- */

class NestedRecords extends Schema.from({
  dict: one(t.map(t.string, t.map(t.string, t.string))),
}) {}

class NestedMaps extends Schema.from({
  nested: one(t.map(t.string, t.map(t.string, t.number))),
}) {}

class MixedNested extends Schema.from({
  mixed: one(t.map(t.string, t.map(t.number, t.string))),
}) {}

/* -------------------------------------------------------------------------- */
/*  Runtime behaviour                                                         */
/* -------------------------------------------------------------------------- */

describe("Schema record & map support (native)", () => {
  it("supports simple Record and Map inputs", () => {
    const instance = new SimpleMaps({
      meta: { hello: "world" },
      // Map input (allowed at runtime)
      flags: new Map<number, boolean>([
        [1, true],
        [2, false],
      ]),
    });

    expect(instance.meta).toEqual({ hello: "world" });
    // The library keeps the Map instance as-is – callers may still Map.get()
    expect(instance.flags).toBeInstanceOf(Map);
    const flagsMap = instance.flags as Map<number, boolean>;
    expect(flagsMap.get(1)).toBe(true);
  });

  it("supports nested Record<Record<…>> fields", () => {
    const instance = new NestedRecords({
      dict: { outer: { inner: "value" } },
    });
    const dict = instance.dict as Record<string, Record<string, string>>;
    expect(dict.outer.inner).toBe("value");
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

    const nestedMap = instance.nested as Map<string, Map<string, number>>;
    expect(nestedMap.get("first")).toBe(inner1);
    expect(nestedMap.get("second")?.get("b")).toBe(2);
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

    const map = (instance.mixed as Record<string, Map<number, string>>).section;
    expect(map).toBeInstanceOf(Map);
    expect(map.get(2)).toBe("two");
  });
});
