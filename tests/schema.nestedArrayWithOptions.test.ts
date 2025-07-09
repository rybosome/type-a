import { describe, it, expect } from "vitest";

import { Schema, Of, with as withSchema, one, many, nested } from "@rybosome/type-a";

const validLogin = (arr: LoginAttempt[]): true | string => {
  // Every LoginAttempt must have a non-negative timestamp
  return arr.every((v) => v.unixTimestampMs >= 0)
    ? true
    : "timestamp must be positive";
};

class LoginAttempt extends Schema.from({
  success: Of<one, boolean>({}),
  unixTimestampMs: Of<one, number>({}),
}) {}

class User extends Schema.from({
  loginAttempts: withSchema(LoginAttempt).Of<many, nested<LoginAttempt>>({
    is: validLogin,
  }),
}) {}

describe("Schema – nested schema arrays with options", () => {
  it("constructs and validates nested array from plain objects", () => {
    const u = new User({
      loginAttempts: [
        { success: true, unixTimestampMs: 100 },
        { success: false, unixTimestampMs: 200 },
      ],
    });

    // Each element should have been auto-instantiated as LoginAttempt
    expect(u.loginAttempts).toHaveLength(2);
    expect(u.loginAttempts[0]).toBeInstanceOf(LoginAttempt);
    expect(u.loginAttempts[1]).toBeInstanceOf(LoginAttempt);

    // Custom `is` validator should pass (positive timestamps)
    expect(u.validate()).toEqual([]);
  });

  it("runs custom validator and surfaces errors", () => {
    const u = new User({
      loginAttempts: [{ success: true, unixTimestampMs: -1 }],
    });

    const errs = u.validate();
    expect(errs).toContain("timestamp must be positive");
  });
});
