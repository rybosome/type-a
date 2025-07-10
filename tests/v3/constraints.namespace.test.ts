import { describe, it, expect } from "vitest";
import * as typeA from "@rybosome/type-a";

const { constraints } = typeA;

// The constraint helpers should be accessible both via the namespace and as
// individual named exports (for backwards-compatibility).

describe("constraints namespace", () => {
  it("exposes aUUID and atLeast helpers", () => {
    expect(typeof constraints.aUUID).toBe("function");
    expect(typeof constraints.atLeast).toBe("function");
  });

  it("matches individual named exports for backwards-compat", () => {
    expect(constraints.aUUID).toBe(typeA.aUUID);
    expect(constraints.atLeast).toBe(typeA.atLeast);
  });
});
