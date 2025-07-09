/**
 * Tests the static `tryNew` schema class creation method.
 */

import { describe, it, expect } from "vitest";
import { Schema, Of, nonEmpty, atLeast } from "@rybosome/type-a";

// Create a minimal schema with two distinct fields
const User = Schema.from({
  name: Of<string>({ is: nonEmpty }),
  age: Of<number>({ is: atLeast(18) }),
});

describe("Schema.tryNew", () => {
  it("returns `val` on success and `errs` undefined", () => {
    const res = User.tryNew({ name: "Alice", age: 30 });

    // success shape
    expect(res.val).toBeDefined();
    expect(res.errs).toBeUndefined();

    // validate content
    const val = res.val!;
    expect(val.name).toBe("Alice");
    expect(val.age).toBe(30);

    // ensure the instance is derived from Schema
    expect(val).toBeInstanceOf(Schema);
  });

  it("returns `errs` on failure and `val` undefined", () => {
    const res = User.tryNew({ name: "", age: 10 });

    // failure shape
    expect(res.val).toBeUndefined();
    expect(res.errs).toBeDefined();

    const errs = res.errs!;

    // field-level messages
    expect(errs).toHaveProperty("name", "must not be empty");
    expect(errs).toHaveProperty("age", "10 is not atLeast(18)");

    // all schema keys represented in ErrLog
    expect(Object.keys(errs)).toEqual(expect.arrayContaining(["name", "age"]));

    // summarize returns raw validation messages
    expect(errs.summarize()).toEqual(
      expect.arrayContaining([
        "name: must not be empty",
        "age: 10 is not atLeast(18)",
      ]),
    );
  });
});
