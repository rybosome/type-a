import { describe, it, expect } from "vitest";
import { constraints, aUUID, atLeast } from "@rybosome/type-a";

// The constraint helpers should be accessible both via the namespace and as
// individual named exports (for backwards-compatibility).

describe("constraints namespace", () => {
  it("exposes aUUID and atLeast helpers", () => {
    expect(typeof constraints.aUUID).toBe("function");
    expect(typeof constraints.atLeast).toBe("function");
  });

  it("references are identical to individual exports", () => {
    expect(constraints.aUUID).toBe(aUUID);
    expect(constraints.atLeast).toBe(atLeast);
  });
});
