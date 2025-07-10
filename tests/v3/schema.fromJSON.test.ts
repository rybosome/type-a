/**
 * Tests the static `fromJSON` helper against the **v3 runtime**.
 */

import { describe, it, expect } from "vitest";

import { Schema } from "@src/schema";
import { one } from "@src/field";
import { t } from "@src/typed";

import { constraints as c } from "@src/index";

// Minimal schema with two constrained fields
const User = Schema.from({
  name: one(t.string, { is: c.nonEmpty }),
  age: one(t.number, { is: c.atLeast(18) }),
});

describe("Schema.fromJSON (v3)", () => {
  it("returns `val` on success and `errs` undefined", () => {
    const res = User.fromJSON({ name: "Alice", age: 30 });

    expect(res.val).toBeDefined();
    expect(res.errs).toBeUndefined();

    const val = res.val!;
    expect(val.name).toBe("Alice");
    expect(val.age).toBe(30);
    expect(val).toBeInstanceOf(Schema);
  });

  it("returns `errs` on failure and `val` undefined", () => {
    const res = User.fromJSON({ name: "", age: 10 });

    expect(res.val).toBeUndefined();
    expect(res.errs).toBeDefined();

    const errs = res.errs!;
    expect(errs.name).toBe("must not be empty");
    expect(errs.age).toBe("10 is not atLeast(18)");

    expect(Object.keys(errs)).toEqual(expect.arrayContaining(["name", "age"]));
    expect(errs.summarize()).toEqual(
      expect.arrayContaining([
        "name: must not be empty",
        "age: 10 is not atLeast(18)",
      ]),
    );
  });
});
