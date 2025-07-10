/**
 * Native JavaScript `Set` support tests for the `many()` helper.
 */

import { describe, it, expect } from "vitest";

import { Schema, many } from "@rybosome/type-a";

/* -------------------------------------------------------------------------- */
/*  Basic Set field                                                            */
/* -------------------------------------------------------------------------- */

class TagCollection extends Schema.from({
  tags: many().of<Set<string>>({}),
}) {}

/* -------------------------------------------------------------------------- */
/*  Runtime behaviour                                                          */
/* -------------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /*  Compile-time expectations (non-executed)                               */
  /* ---------------------------------------------------------------------- */

  // @ts-expect-error – number not assignable to string inside Set
  // prettier-ignore
  void new TagCollection({ tags: new Set<number>([1, 2, 3]) });
});
