import { describe, it, expect } from "vitest";
import { Schema, one, typing as t } from "@rybosome/type-a";

class Flags extends Schema.from({
  active: one(t.boolean),
  score: one(t.number),
}) {}

describe("Schema - strict primitive validation", () => {
  it("accepts correct primitive types", () => {
    const f = new Flags({ active: true, score: 5 });
    expect(f.validate()).toEqual([]);
  });

  it("rejects incorrect primitive types", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = Flags.fromJSON({ active: 1, score: "bad" } as any);
    const errs = f.errs!;
    expect(errs.active).toBe("expected boolean");
    expect(errs.score).toBe("expected number");
  });
});
