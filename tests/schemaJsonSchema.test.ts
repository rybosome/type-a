import { describe, it, expect } from "vitest";
import { Schema, Of, aUUID, atLeast } from "@rybosome/type-a";

describe("Schema.jsonSchema()", () => {
  class User extends Schema.from({
    id: Of<string>({ is: aUUID, default: "" }),
    age: Of<number>({ is: atLeast(18), default: 0 }),
    active: Of<boolean>({ default: true }),
  }) {}

  it("produces a valid JSON-Schema for primitive fields", () => {
    expect(User.jsonSchema()).toEqual({
      $schema: "http://json-schema.org/draft-07/schema#",
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
