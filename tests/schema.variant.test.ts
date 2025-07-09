import { describe, it, expect } from "vitest";

import { Schema, Of, Variant } from "@rybosome/type-a";

class A extends Schema.from({
  kind: Of<"A">(), // keep literal helper via generic – still ok
  a: Of<string>(),
}) {}

class B extends Schema.from({
  kind: Of<"B">(),
  b: Of<number>(),
}) {}

class Wrapper extends Schema.from({
  value: Of<Variant<[typeof A, typeof B]>>({
    variantClasses: [A, B],
  }),
}) {}

describe("Schema – variant unions", () => {
  it("instantiates the correct variant constructor", () => {
    const w1 = new Wrapper({ value: { kind: "A", a: "x" } });
    expect(w1.value).toBeInstanceOf(A);

    const w2 = new Wrapper({ value: { kind: "B", b: 123 } });
    expect(w2.value).toBeInstanceOf(B);
  });

  it("validates variant fields", () => {
    const bad = new Wrapper({
      value: { kind: "B", b: "not num" as unknown as number },
    });
    const errs = bad.validate();
    expect(errs.length).toBeGreaterThan(0);
  });
});
