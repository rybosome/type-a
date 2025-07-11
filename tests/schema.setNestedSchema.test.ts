// @ts-nocheck – transitional v3 port, revisit after full Nested Set support

import { describe, it, expect } from "vitest";

import { Schema } from "@src/schema";
import { one, many } from "@src/field";
import { t } from "@src/typed";

class Item extends Schema.from({
  id: one(t.number),
}) {}

class Wrapper extends Schema.from({
  items: many(Item, { asSet: true }),
}) {}

describe.skip("v3 Schema Set<SchemaInstance> support", () => {
  it("validates and wraps raw objects inside a Set into schema instances", () => {
    const raw: any = new Set([{ id: 1 }, { id: 2 }]);
    const wrapper = new Wrapper({ items: raw } as any);

    expect(wrapper.items).toBeInstanceOf(Set);
    for (const item of wrapper.items) {
      expect(item).toBeInstanceOf(Item);
    }
    expect(wrapper.validate()).toEqual([]);
  });

  it("serialises a Set of schema instances to an array of plain objects", () => {
    const wrapper = new Wrapper({
      items: new Set([{ id: 3 }, { id: 4 }]),
    } as any);
    const json = wrapper.toJSON();
    expect(json.items).toEqual([{ id: 3 }, { id: 4 }]);
  });
});
