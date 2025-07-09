import { describe, it, expect } from "vitest";

import { Schema, Of } from "@rybosome/type-a";

class Flags extends Schema.from({
  active: Of<boolean>(),
  score: Of<number>(),
}) {}

describe.skip("Schema – strict primitive validation", () => {
  it("accepts correct primitive types", () => {
    const f = new Flags({ active: true, score: 5 });
    expect(f.validate()).toEqual([]);
  });

  it("rejects incorrect primitive types", () => {
    // @ts-expect-error: intentionally bad input for runtime test
    const f = new Flags({ active: 1, score: "bad" });
    const errs = f.validate();
    expect(errs).toContain("active: expected boolean");
    expect(errs).toContain("score: expected finite number");
  });
});
