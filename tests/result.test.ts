import { describe, it, expect } from "vitest";
import type { ErrLog, Maybe } from "@rybosome/type-a";

describe("ErrLog", () => {
  it("summarize returns the provided error strings", () => {
    const log: ErrLog<{ a: number; b: string }> = {
      a: "bad a",
      b: undefined,
      summarize: () => ["a: bad a"],
    };

    expect(log.summarize()).toEqual(["a: bad a"]);
  });
});

describe("Maybe<T>", () => {
  it("represents success or failure results", () => {
    type Payload = { x: number };

    const success: Maybe<Payload> = { val: { x: 1 }, errs: undefined };
    const failure: Maybe<Payload> = {
      val: undefined,
      errs: { x: "bad", summarize: () => ["x: bad"] },
    };

    // success shape
    expect(success.val).toEqual({ x: 1 });
    expect(success.errs).toBeUndefined();

    // failure shape
    expect(failure.val).toBeUndefined();
    expect(failure.errs?.summarize()).toEqual(["x: bad"]);
  });
});
