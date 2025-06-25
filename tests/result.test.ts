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
  it("behaves as an optional value (T | undefined)", () => {
    const some: Maybe<number> = 42;
    const none: Maybe<number> = undefined;

    expect(some).toBe(42);
    expect(none).toBeUndefined();
  });
});
