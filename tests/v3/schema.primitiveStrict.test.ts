import { describe, it, expect } from "vitest";

import { Schema } from "../../src/v3/schema";
import { one } from "../../src/v3/field";
import { t } from "../../src/v3/typed";

class Flags extends Schema.from({
  active: one(t.boolean),
  score: one(t.number),
}) {}

describe("v3 Schema – strict primitive validation", () => {
  it("accepts correct primitive types", () => {
    const f = new Flags({ active: true, score: 5 });
    expect(f.validate()).toEqual([]);
  });

  it("rejects incorrect primitive types", () => {
    const f = Flags.fromJSON({ active: 1, score: "bad" } as any);
    const errs = f.errs!;
    expect(errs.active).toBe("expected boolean");
    expect(errs.score).toBe("expected number");
  });
});
