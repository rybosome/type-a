import { describe, it, expect } from "vitest";

import { Schema, Of } from "@rybosome/type-a";

class Item extends Schema.from({
  label: Of<string>(),
}) {}

class Box extends Schema.from({
  items: Of([Item]),
}) {}

describe("Schema – nestedArray registration (identity stub)", () => {
  it("rehydrates array elements into schema instances", () => {
    const b = new Box({ items: [{ label: "hello" }] });
    expect(b.items[0]).toBeInstanceOf(Item);
  });
});
