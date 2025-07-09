/**
 * Tests type union in schema definitions.
 */

import { describe, it, expect } from "vitest";
import { Schema, one } from "@rybosome/type-a";

import type { Typeable } from "@rybosome/type-a";
const Of = <T extends Typeable>(opts: any = {}) => one().of<T>(opts);

class Response extends Schema.from({
  // status may be the literal string "ok" or any numeric HTTP status code
  status: Of<"ok" | number>(),
}) {}

describe("Schema Union type support", () => {
  it("constructs with valid union values", () => {
    const success = new Response({ status: "ok" });
    expect(success.status).toBe("ok");

    const failure = new Response({ status: 429 });
    expect(failure.status).toBe(429);
  });

  it("produces no validation errors for valid inputs", () => {
    const res = Response.tryNew({ status: "ok" });
    expect(res.errs).toBeUndefined();
    expect(res.val?.status).toBe("ok");
  });

  /* -------------------------------------------------------------- */
  /* Invalid inputs (compile-time expectations)                      */
  /* -------------------------------------------------------------- */

  // The following lines are intentionally invalid. They are wrapped in arrow
  // functions so they are *not* executed at runtime, but they are still
  // type-checked by the compiler. The `@ts-expect-error` comments assert that
  // the compiler rejects these calls because the provided value is not part of
  // the allowed union.

  // Boolean is not assignable to "ok" | number
  // @ts-expect-error – boolean is outside the allowed union
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new Response({ status: true });

  // Arbitrary string is not assignable to "ok" | number
  // @ts-expect-error – "error" is outside the allowed union
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  () => new Response({ status: "error" });
});
