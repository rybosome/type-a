import { describe, it, expect } from "vitest";

import { Schema, Of } from "@rybosome/type-a";

const validLogin = (val: LoginAttempt): true | string => {
  // Accept only timestamps >= 0
  return val.unixTimestampMs >= 0 || "timestamp must be positive";
};

class LoginAttempt extends Schema.from({
  success: Of<boolean>(),
  unixTimestampMs: Of<number>(),
}) {}

class User extends Schema.from({
  loginAttempts: Of(Schema.hasMany(LoginAttempt), { is: validLogin }),
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
    expect(errs).toEqual(["loginAttempts[0]: timestamp must be positive"]);
  });
});
