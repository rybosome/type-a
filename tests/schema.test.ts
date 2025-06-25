import { describe, it, expect } from "vitest";
import { Schema, Of, aUUID, atLeast } from "@rybosome/type-a";

describe("BaseModel", () => {
  class User extends Schema.from({
    id: Of<string>({ is: aUUID }),
    age: Of<number>({ is: atLeast(18) }),
    active: Of<boolean>({}),
  }) {
    greet() {
      const accountStatus = this.active ? "active" : "inactive";
      return `My ID is ${this.id}, and my account is ${accountStatus}`;
    }
  }

  it("constructs and exposes fields with correct types", () => {
    const u = new User({
      id: "123e4567-e89b-12d3-a456-426614174000",
      age: 30,
      active: true,
    });
    console.log(u.toJSON());

    // ✅ Type-safe access
    expect(u.id).toBeTypeOf("string");
    expect(u.age).toBeTypeOf("number");
    expect(u.active).toBe(true);
  });

  it("returns validation errors for bad inputs", () => {
    const u = new User({ id: "not-a-uuid", age: 10, active: false });
    console.log(u.toJSON());

    const errors = u.validate();
    expect(errors).toContain("id: Invalid UUID");
    expect(errors).toContain("age: 10 is not atLeast(18)");
  });

  it("serializes to JSON correctly", () => {
    const u = new User({ id: "abc", age: 20, active: true });
    console.log(u.toJSON());
    expect(u.toJSON()).toEqual({ id: "abc", age: 20, active: true });
  });

  it("updates values through setters", () => {
    const u = new User({ id: "abc", age: 20, active: false });
    console.log(u.toJSON());
    u.age = 45;
    expect(u.age).toBe(45);
  });

  it("allows normal class methods", () => {
    const u = new User({ id: "abc", age: 20, active: false });
    console.log(u.toJSON());
    console.log(u.greet());
  });
});
