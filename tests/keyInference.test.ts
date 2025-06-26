import { describe, it, expect, expectTypeOf } from "vitest";
import { Schema, Of } from "@rybosome/type-a";
// Import internal utility types for compile-time assertions.
import type {
  OptionalKeys,
  RequiredKeys,
  InputValueMap,
} from "../src/schema";

/* ------------------------------------------------------------------ */
/* Test suite                                                          */
/* ------------------------------------------------------------------ */

describe("Utility type key inference", () => {
  /* -------------------------------------------- */
  /* Schema under test                            */
  /* -------------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  const schema = {
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
  } as const;

  type S = typeof schema;

  it("computes OptionalKeys and RequiredKeys correctly", () => {
    type O = OptionalKeys<S>;
    type R = RequiredKeys<S>;

    // Expect optional keys
    expectTypeOf<O>().toEqualTypeOf<
      "optional" | "optionalDefault" | "optionalNullable"
    >();

    // Expect required keys
    expectTypeOf<R>().toEqualTypeOf<"required" | "nullable">();
  });

  it("produces the correct InputValueMap shape", () => {
    type In = InputValueMap<S>;

    // Keys with default or explicit undefined become optional properties
    expectTypeOf<In>().toMatchTypeOf<{
      required: string;
      nullable: string | null;
      optional?: string | undefined;
      optionalDefault?: string;
      optionalNullable?: string | null | undefined;
    }>();
  });

  /* -------------------------------------------- */
  /* Runtime checks – constructor behaviour        */
  /* -------------------------------------------- */

  // Instantiate a real model using this schema to ensure the input map is
  // honoured at runtime.
  class Model extends Schema.from(schema) {}

  it("allows omitting optional keys", () => {
    const m = new Model({ required: "foo", nullable: null });
    expect(m.required).toBe("foo");
    expect(m.optional).toBeUndefined();
    expect(m.optionalDefault).toBe("hi"); // default applied
  });

  it("blocks omission of required keys at compile-time", () => {
    // @ts-expect-error – missing both `required` and `nullable`
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _bad = new Model({});
  });
});
