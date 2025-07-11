/**
 * Native JavaScript `Set` support for `many()`.
 */

import { describe, it, expect } from "vitest";
import { Schema, many, typing as t } from "@rybosome/type-a";

class TagCollection extends Schema.from({
  tags: many(t.string, { asSet: true }),
}) {}

describe("Schema Set support", () => {
  it("constructs with a Set value and preserves runtime type", () => {
    const initial = new Set<string>(["alpha", "beta"]);
    const instance = new TagCollection({ tags: initial });

    expect(instance.tags).toBeInstanceOf(Set);
    expect(instance.tags.has("alpha")).toBe(true);
    expect(instance.validate()).toEqual([]);
  });

  it("serialises a Set to an array via toJSON()", () => {
    const instance = new TagCollection({ tags: new Set(["x", "y", "z"]) });
    const json = instance.toJSON();
    expect(json.tags).toEqual(["x", "y", "z"]);
  });

  // @ts-expect-error – number not assignable to string inside Set
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new TagCollection({ tags: new Set<number>([1, 2, 3]) });
});
