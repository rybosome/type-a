/**
 * Tests basic and overall functionality of a Schema.
 */

import { describe, it, expect } from "vitest";
import { Schema, one, aUUID, atLeast } from "@rybosome/type-a";

describe("Schema", () => {
  describe("basic functionality", () => {
    class User extends Schema.from({
      id: one().of<string>({ is: aUUID }),
      age: one().of<number>({ is: atLeast(18) }),
      active: one().of<boolean>({ default: true }), // default added here
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
      required: one().of<string>({}),

      // optional – `undefined` explicitly allowed
      optional: one().of<string | undefined>({}),

      // optional – default provided
      optionalDefault: one().of<string>({ default: "hi" }),

      // nullable but still required (null OR string) – `undefined` not allowed
      nullable: one().of<string | null>({}),

      // optional & nullable – both undefined and null allowed
      optionalNullable: one().of<string | null | undefined>({}),
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
      // Intentionally constructing with missing required fields – should **not** type-check.
      // `@ts-expect-error` tells TypeScript we expect an error here so the build still passes.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // @ts-expect-error – required & nullable keys are missing
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
        flag: one().of<boolean>({ default: nextBool }),
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
        name: one().of<string>({ default: fn }),
      }) {}

      const m = new Model({ name: "provided" });
      expect(m.name).toBe("provided");
      expect(executed).toBe(false);
    });
  });

  describe("composite validators", () => {
    it("accepts a value when all composed validators pass", () => {
      class Model extends Schema.from({
        age: one().of<number>({
          is: [
            atLeast(10),
            (v: number) => (v % 2 === 0 ? true : "must be even"),
          ],
        }),
      }) {}

      const m = new Model({ age: 12 });
      expect(m.validate()).toEqual([]);
    });

    it("returns the first failing message when composed validators fail", () => {
      const mustBeEven = (v: number) => (v % 2 === 0 ? true : "must be even");

      class Model extends Schema.from({
        age: one().of<number>({ is: [atLeast(10), mustBeEven] }),
      }) {}

      const invalidLow = new Model({ age: 8 }); // fails atLeast(10) first
      expect(invalidLow.validate()).toEqual(["age: 8 is not atLeast(10)"]);

      const invalidOdd = new Model({ age: 11 }); // passes atLeast(10), fails even check
      expect(invalidOdd.validate()).toEqual(["age: must be even"]);
    });

    /* ------------------------------------------------------------------ */
    /* BigInt primitive support                                            */
    /* ------------------------------------------------------------------ */

    describe("bigint primitive", () => {
      class BigIntModel extends Schema.from({
        qty: one().of<bigint>({}),
      }) {}

      it("accepts a valid BigInt value", () => {
        const m = new BigIntModel({ qty: 42n });
        expect(m.qty).toBeTypeOf("bigint");
        expect(m.qty).toBe(42n);
        expect(m.validate()).toEqual([]);
      });

      it("handles very large and negative BigInt values", () => {
        const veryLarge = 123456789012345678901234567890123456789n;
        const negative = -999999999999999999999999999999999999n;

        const largeModel = new BigIntModel({ qty: veryLarge });
        const negativeModel = new BigIntModel({ qty: negative });

        expect(largeModel.qty).toBe(veryLarge);
        expect(negativeModel.qty).toBe(negative);
        expect(largeModel.validate()).toEqual([]);
        expect(negativeModel.validate()).toEqual([]);
      });

      it("blocks non-BigInt inputs at compile-time", () => {
        // @ts-expect-error – string is not assignable to bigint
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _badString = new BigIntModel({ qty: "123" });

        // @ts-expect-error – number is not assignable to bigint
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _badNumber = new BigIntModel({ qty: 123 });
      });
    });
  });

  /* ---------------------------------------------------------------------- */
  /*  Literal union type support                                            */
  /* ---------------------------------------------------------------------- */

  describe("literal union type support", () => {
    /*
     * Define a union of string literals.  At compile-time only the exact
     * three literals below are permitted.
     */
    type Color = "red" | "green" | "blue";

    /*
     * Schema under test.  No custom validator is provided – we rely on the
     * library's ability to preserve the literal union information and expose
     * it via the generated constructor type.
     */
    class Marker extends Schema.from({
      color: one().of<Color>({}),
      scented: one().of<boolean>({}),
    }) {}

    it("constructs with any allowed literal value and preserves it exactly", () => {
      const palette: Color[] = ["red", "green", "blue"];

      for (const c of palette) {
        const m = new Marker({ color: c, scented: false });
        expect(m.color).toBe(c);
        expect(m.scented).toBe(false);
      }
    });

    /* ------------------------------------------------------------------ */
    /*  Compile-time expectations (invalid literals)                      */
    /* ------------------------------------------------------------------ */

    // Each arrow-function wrapper below is *never executed* at runtime.  It
    // exists solely so the TypeScript compiler can verify that the provided
    // value does *not* satisfy the declared union.  The accompanying
    // `@ts-expect-error` assertions enforce that the call fails to type-check.

    // ---- Invalid literal string ---------------------------------------

    // @ts-expect-error – "yellow" is not part of the Color union
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    () => new Marker({ color: "yellow", scented: true });

    // ---- Invalid primitive types --------------------------------------

    // @ts-expect-error – number is not assignable to Color
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    () => new Marker({ color: 123, scented: true });

    // @ts-expect-error – null is not assignable to Color
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    () => new Marker({ color: null, scented: true });

    // ---- Boolean field validations ------------------------------------

    // @ts-expect-error – "yes" is not a boolean
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    () => new Marker({ color: "red", scented: "yes" });

    // @ts-expect-error – 0 is not a boolean
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    () => new Marker({ color: "blue", scented: 0 });
  });
});
