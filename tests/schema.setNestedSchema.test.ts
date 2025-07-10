import { describe, it, expect, test } from "vitest";

import { Schema, one, many } from "@rybosome/type-a";

// Simple item schema with a numeric ID
class Item extends Schema.from({
  id: one().of<number>({}),
}) {}

// Wrapper schema holding a Set of Item schema instances via many().
class Wrapper extends Schema.from({
  items: many(Item).of<Set<Item>>({}),
}) {}

// ---------------------------------------------------------------------------
// Runtime behaviour – validation, instantiation & serialisation
// ---------------------------------------------------------------------------

describe("Schema Set<SchemaInstance> support", () => {
  // We skip when nested Set-of-schema support is incomplete.
  // Remove the `test.skip` wrapper once issues/65 is fully addressed.
  // However, current implementation already appears to work; run live.

  it("validates and wraps raw objects inside a Set into schema instances", () => {
    const raw = new Set([{ id: 1 }, { id: 2 }]);

    const wrapper = new Wrapper({ items: raw });

    // Ensure runtime value is still a Set
    expect(wrapper.items).toBeInstanceOf(Set);

    // All elements should be Item schema instances and validated.
    for (const item of wrapper.items) {
      expect((item as any).__isSchemaInstance).toBe(true);
      expect(item).toBeInstanceOf(Item);
    }

    // No validation errors expected
    expect(wrapper.validate()).toEqual([]);
  });

  it("serialises a Set of schema instances to an array of plain objects", () => {
    const wrapper = new Wrapper({ items: new Set([{ id: 3 }, { id: 4 }]) });

    const json = wrapper.toJSON();

    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items).toEqual([{ id: 3 }, { id: 4 }]);
  });
});
