/**
 * Tests basic and overall functionality of a Schema.
 */

import { describe, it, expect } from "vitest";
import { Schema, Of, aUUID, atLeast } from "@rybosome/type-a";

describe("Schema", () => {
  describe("basic functionality", () => {
    class User extends Schema.from({
      id: Of<string>({ is: aUUID }),
      age: Of<number>({ is: atLeast(18) }),
      active: Of<boolean>({ default: true }), // default added here
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
      }); // 'active' omitted – default kicks in
      expect(u.id).toBeTypeOf("string");
      expect(u.age).toBeTypeOf("number");
      expect(u.active).toBe(true); // default applied
    });

    it("returns validation errors for bad inputs", () => {
      const u = new User({ id: "not-a-uuid", age: 10 });
      const errors = u.validate();
      expect(errors).toContain("id: Invalid UUID");
      expect(errors).toContain("age: 10 is not atLeast(18)");
    });

    it("serializes to JSON correctly", () => {
      const u = new User({ id: "abc", age: 20, active: false });
      expect(u.toJSON()).toEqual({ id: "abc", age: 20, active: false });
    });

    it("updates values through setters", () => {
      const u = new User({ id: "abc", age: 20 });
      u.age = 45;
      expect(u.age).toBe(45);
    });

    it("allows normal class methods", () => {
      const u = new User({ id: "abc", age: 20 });
      expect(u.greet()).toBe("My ID is abc, and my account is active");
    });
  });

  describe("optional & nullable fields", () => {
    class OptModel extends Schema.from({
      // required – no default and `undefined` not allowed
      required: Of<string>({}),

      // optional – `undefined` explicitly allowed
      optional: Of<string | undefined>({}),

      // optional – default provided
      optionalDefault: Of<string>({ default: "hi" }),

      // nullable but still required (null OR string) – `undefined` not allowed
      nullable: Of<string | null>({}),

      // optional & nullable – both undefined and null allowed
      optionalNullable: Of<string | null | undefined>({}),
    }) {}

    it("allows omitting optional keys", () => {
      const m = new OptModel({ required: "foo", nullable: null });
      expect(m.required).toBe("foo");
      expect(m.optional).toBeUndefined();
      expect(m.optionalDefault).toBe("hi"); // default applied
      expect(m.nullable).toBeNull();
      expect(m.optionalNullable).toBeUndefined();
    });

    it("blocks omission of required keys at compile-time", () => {
      // @ts-expect-error – missing both `required` and `nullable`
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _bad = new OptModel({});
    });
  });

  describe("callable default handling", () => {
    it("applies callable default exactly once per instance", () => {
      let calls = 0;
      const nextBool = () => {
        calls += 1;
        return calls % 2 === 1; // true on 1st, false on 2nd, …
      };

      class Model extends Schema.from({
        flag: Of<boolean>({ default: nextBool }),
      }) {}

      const a = new Model({});
      const b = new Model({});

      expect(a.flag).toBe(true); // first call (calls === 1)
      expect(b.flag).toBe(false); // second call (calls === 2)
      expect(calls).toBe(2);
    });

    it("does not invoke callable default when caller supplies a value", () => {
      let executed = false;
      const fn = () => {
        executed = true;
        return "should-not-be-used";
      };

      class Model extends Schema.from({
        name: Of<string>({ default: fn }),
      }) {}

      const m = new Model({ name: "provided" });
      expect(m.name).toBe("provided");
      expect(executed).toBe(false);
    });
  });

  describe("composite validators", () => {
    it("accepts a value when all composed validators pass", () => {
      class Model extends Schema.from({
        age: Of<number>({
          is: [atLeast(10), (v) => (v % 2 === 0 ? true : "must be even")],
        }),
      }) {}

      const m = new Model({ age: 12 });
      expect(m.validate()).toEqual([]);
    });

    it("returns the first failing message when composed validators fail", () => {
      const mustBeEven = (v: number) => (v % 2 === 0 ? true : "must be even");

      class Model extends Schema.from({
        age: Of<number>({ is: [atLeast(10), mustBeEven] }),
      }) {}

      const invalidLow = new Model({ age: 8 }); // fails atLeast(10) first
      expect(invalidLow.validate()).toEqual(["age: 8 is not atLeast(10)"]);

      const invalidOdd = new Model({ age: 11 }); // passes atLeast(10), fails even check
      expect(invalidOdd.validate()).toEqual(["age: must be even"]);
    });
  });
});
