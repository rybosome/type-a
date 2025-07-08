import { Schema, Of, enumValued } from "@rybosome/type-a";

enum Status {
  OK = "ok",
  ERROR = "error",
}

class Response extends Schema.from({
  status: Of(enumValued(Status)),
}) {}

describe("Schema enum-valued fields", () => {
  it("infers the literal union type for the field", () => {
    // Compile-time only – assignment to a widened value should fail.
    // Compile-time only check – should error
    // @ts-expect-error – "pending" is not part of the Status enum
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    () => new Response({ status: "pending" });

    // Valid compile-time assignment should pass (and runtime too)
    const good = new Response({ status: Status.OK });
    expect(good.status).toBe("ok");
  });

  it("validates runtime input against the enum values", () => {
    const res = Response.tryNew({ status: "pending" } as any);
    expect(res.val).toBeUndefined();
    expect(res.errs?.status).toBeDefined();

    const ok = Response.tryNew({ status: "ok" } as any);
    expect(ok.errs).toBeUndefined();
    expect(ok.val?.status).toBe("ok");
  });
});
