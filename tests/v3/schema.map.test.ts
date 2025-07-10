/**
 * Record<X, Y> and Map<X, Y> support – **v3 runtime**.
 */

import { describe, it, expect } from "vitest";

import { Schema } from "../../src/v3/schema";
import { one } from "../../src/v3/field";
import { t } from "../../src/v3/typed";

/* -------------------------------------------------------------------------- */
/*  Simple Record & Map fields                                                */
/* -------------------------------------------------------------------------- */

class SimpleMaps extends Schema.from({
  meta: one(t.any<Record<string, string>>()),
  flags: one(t.any<Map<number, boolean>>()),
}) {}

/* -------------------------------------------------------------------------- */
/*  Nested structures                                                         */
/* -------------------------------------------------------------------------- */

class NestedRecords extends Schema.from({
  dict: one(t.any<Record<string, Record<string, string>>>()),
}) {}

class NestedMaps extends Schema.from({
  nested: one(t.any<Map<string, Map<string, number>>>()),
}) {}

class MixedNested extends Schema.from({
  mixed: one(t.any<Record<string, Map<number, string>>>()),
}) {}

/* -------------------------------------------------------------------------- */
/*  Runtime behaviour                                                         */
/* -------------------------------------------------------------------------- */

describe("v3 Schema record & map support", () => {
  it("supports simple Record and Map fields", () => {
    const instance = new SimpleMaps({
      meta: { hello: "world" },
      flags: new Map<number, boolean>([
        [1, true],
        [2, false],
      ]),
    });

    expect(instance.meta).toEqual({ hello: "world" });
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

  // (Compile-time negative cases omitted in v3 port)
});
