import { Schema, Of } from "@rybosome/type-a";

class LoginAttempt extends Schema.from({
  success: Of<boolean>(),
}) {}

class User extends Schema.from({
  loginAttempts: Of<LoginAttempt[]>(),
}) {}
