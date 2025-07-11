/**
 * Legacy variant-union test path – modernised for v3 runtime. Mirrors the
 * variant section of `tests/v3/union_variant.test.ts` so that existing tooling
 * that references this filename continues to execute meaningful checks.
 */

import { describe, it, expect } from "vitest";

import { Schema } from "@src/schema";
import { one } from "@src/field";
import { t } from "@src/typed";

class Cat extends Schema.from({
  kind: one(t.literal("cat")),
  meows: one(t.boolean),
}) {}

class Dog extends Schema.from({
  kind: one(t.literal("dog")),
  barks: one(t.boolean),
}) {}

class PetOwner extends Schema.from({
  pet: one(t.variant([Cat, Dog])),
}) {}

describe("Schema – variant unions (v3)", () => {
  it("instantiates the correct variant constructor", () => {
    const w1 = new PetOwner({ pet: { kind: "cat", meows: true } });
    expect(w1.pet).toBeInstanceOf(Cat);

    const w2 = new PetOwner({ pet: { kind: "dog", barks: true } });
    expect(w2.pet).toBeInstanceOf(Dog);
  });

  it("validates variant fields", () => {
    const bad = new PetOwner({ pet: { kind: "dog", barks: "nope" } as any });
    const errs = bad.validate();
    expect(errs.length).toBeGreaterThan(0);
  });
});
