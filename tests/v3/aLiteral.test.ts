import { describe, it, expect } from "vitest";

// The helper lives outside the v3 runtime – import directly from its module
import { aLiteral } from "../../src/conditionals/utils";

describe("aLiteral helper (v3 port)", () => {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    () => isFlag(1);

    const isStatus = aLiteral(200, 404);
    expect(isStatus(200)).toBe(true);
    expect(isStatus(404)).toBe(true);
    expect(isStatus(500 as any)).toBe("500 is not one of [200, 404]");
  });
});
