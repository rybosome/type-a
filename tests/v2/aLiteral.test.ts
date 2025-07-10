import { describe, it, expect } from "vitest";

import { aLiteral } from "@rybosome/type-a";

describe("aLiteral helper", () => {
  it("accepts allowed string literals", () => {
    const isPet = aLiteral("dog", "cat");
    expect(isPet("dog")).toBe(true);
    expect(isPet("cat")).toBe(true);
  });

  it("rejects disallowed string literals", () => {
    const isPet = aLiteral("dog", "cat");
    expect(isPet("bird" as any)).toBe("bird is not one of [dog, cat]");
  });

  it("works with mixed primitive literal types", () => {
    const isFlag = aLiteral<readonly [true, false]>(true, false);
    expect(isFlag(true)).toBe(true);
    expect(isFlag(false)).toBe(true);
    // @ts-expect-error – number is not part of the union
    () => isFlag(1);

    const isStatus = aLiteral(200, 404);
    expect(isStatus(200)).toBe(true);
    expect(isStatus(404)).toBe(true);
    expect(isStatus(500 as any)).toBe("500 is not one of [200, 404]");
  });
});
