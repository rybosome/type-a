import { describe, it, expect } from "vitest";

import { Schema, Of } from "@rybosome/type-a";

class Flags extends Schema.from({
  // use sugar helpers (via cast) so runtime validators are attached
  active: (Of as any).boolean(),
  score: (Of as any).number(),
}) {}

describe("Schema – strict primitive validation", () => {
  it("accepts correct primitive types", () => {
    const f = new Flags({ active: true, score: 5 });
    expect(f.validate()).toEqual([]);
  });

  it("rejects incorrect primitive types", () => {
    const f = new Flags({ active: 1 as any, score: "bad" as any });
    const errs = f.validate();
    expect(errs).toContain("active: expected boolean");
    expect(errs).toContain("score: expected finite number");
  });
});
