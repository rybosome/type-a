import { describe, it, expect } from "vitest";
import { Schema, Of, aUUID, atLeast } from "@rybosome/type-a";

describe("Schema.jsonSchema()", () => {
  class User extends Schema.from({
    id: Of<string>({ is: aUUID }),
    age: Of<number>({ is: atLeast(18) }),
    active: Of<boolean>({}),
  }) {}

  it("produces a valid JSON-Schema for primitive fields", () => {
    // create one instance so runtime types are known
    new User({ id: "abc", age: 42, active: true });
    expect(User.jsonSchema()).toEqual({
      type: "object",
      properties: {
        id: { type: "string" },
        age: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["id", "age", "active"],
    });
  });
});
