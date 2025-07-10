import { describe, it, expect } from "vitest";

import { Schema, one } from "@rybosome/type-a";

class Flags extends Schema.from({
  active: one().of<boolean>({}),
  score: one().of<number>({}),
}) {}

describe("Schema – strict primitive validation", () => {
  it("accepts correct primitive types", () => {
    const f = new Flags({ active: true, score: 5 });
    expect(f.validate()).toEqual([]);
  });

  it("rejects incorrect primitive types", () => {
    const f = Flags.fromJSON({ active: 1, score: "bad" });
    const errs = f.errs!;
    expect(errs.active).toBe("active: expected boolean");
    expect(errs.score).toBe("score: expected finite number");
  });
});
