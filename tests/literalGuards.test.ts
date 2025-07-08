/**
 * Verifies that `Of<T>` automatically generates runtime validators for
 * _literal_ unions (string / number / boolean) when the caller omits an
 * explicit `is` callback.
 */

import { describe, it, expect } from "vitest";
import { Schema, Of } from "@rybosome/type-a";

// A union of **string literals only** – no broad primitive types included.
type PostState = "draft" | "published" | "archived";

class Post extends Schema.from({
  state: Of<PostState>(), // implicit runtime guard
}) {}

describe("Implicit literal runtime guards", () => {
  it("accepts valid literal values", () => {
    const valid: PostState[] = ["draft", "published", "archived"];
    for (const s of valid) {
      const p = new Post({ state: s });
      expect(p.state).toBe(s);
      expect(p.validate()).toEqual([]);
    }
  });

  it("rejects values outside the literal union", () => {
    // debug
    console.log('stack in test', new Error().stack);
    // Cast through `any` to circumvent compile-time protection so we can test
    // the *runtime* validator.
    const bad = Post.tryNew({ state: "pending" as any });

    expect(bad.val).toBeUndefined();
    expect(bad.errs?.state).toMatch(/not one of/);
  });
});
