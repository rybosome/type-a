import { describe, it, expect } from "vitest";

import { Schema, Of } from "@rybosome/type-a";

// Custom validator that ensures all timestamps in the array are positive.
const positiveTimestamp = (arr: LoginAttempt[]): true | string =>
  arr.every((v) => v.unixTimestampMs >= 0) || "timestamp must be positive";

class LoginAttempt extends Schema.from({
  success: Of<boolean>(),
  unixTimestampMs: Of<number>(),
}) {}

class User extends Schema.from({
  // Demonstrate array-of-schema support + custom validator via `is`
  loginAttempts: Of([LoginAttempt], { is: positiveTimestamp }),
}) {}

describe("Schema – nested schema arrays with options", () => {
  it("constructs and validates instances created from schema instances", () => {
    const u = new User({
      loginAttempts: [
        { success: true, unixTimestampMs: 123 },
        { success: false, unixTimestampMs: 456 },
      ],
    });

    expect(u.loginAttempts).toHaveLength(2);
    expect(u.loginAttempts[0]).toBeInstanceOf(LoginAttempt);
    expect(u.loginAttempts[1]).toBeInstanceOf(LoginAttempt);

    // Positive timestamps – validator passes
    expect(u.validate()).toEqual([]);
  });

  it("surfaces validation errors with correct path", () => {
    const u = new User({
      loginAttempts: [{ success: true, unixTimestampMs: -1 }],
    });

    expect(u.validate()).toEqual(["loginAttempts: timestamp must be positive"]);
  });
});
