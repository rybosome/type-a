import { describe, it, expect } from "vitest";

import { Schema, Of } from "@rybosome/type-a";

/* ----------------------------------------------------------- */
/* Helpers                                                     */
/* ----------------------------------------------------------- */

// Convenience primitives using existing `Of<T>()` helpers so we avoid the
// stricter `.boolean()` / `.string()` sugar in case the internal API changes.
const bool = () => Of<boolean>();
const num = () => Of<number>();
const str = () => Of<string>();

/* ----------------------------------------------------------- */
/* 1 · Single & multi nested relationships                      */
/* ----------------------------------------------------------- */

class LoginAttempt extends Schema.from({
  success: bool(),
  unixTimestampMs: num(),
}) {}

class LoginRecord extends Schema.from({
  loginAttempt: Of(Schema.hasOne(LoginAttempt)),
}) {}

class User extends Schema.from({
  loginAttempts: Of(Schema.hasMany(LoginAttempt)),
}) {}

/* ----------------------------------------------------------- */
/* 2 · Deeper nesting (array of arrays)                         */
/* ----------------------------------------------------------- */

class Comment extends Schema.from({ msg: str() }) {}

class Post extends Schema.from({
  comments: Of(Schema.hasMany(Comment)),
}) {}

class Blog extends Schema.from({
  posts: Of(Schema.hasMany(Post)),
}) {}

/* ----------------------------------------------------------- */
/* 3 · Nullable variant example                                 */
/* ----------------------------------------------------------- */

class Success extends Schema.from({ kind: Of<"ok">(), data: str() }) {}
class Failure extends Schema.from({ kind: Of<"err">(), message: str() }) {}

class Wrapper extends Schema.from({
  result: Of<Success | Failure | null>(),
}) {}

/* ----------------------------------------------------------- */
/* Tests                                                       */
/* ----------------------------------------------------------- */

describe("Schema – parent-driven hasOne/hasMany", () => {
  it("instantiates scalar nested schemas via hasOne", () => {
    const rec = new LoginRecord({
      loginAttempt: { success: true, unixTimestampMs: 123 },
    });
    expect(rec.loginAttempt).toBeInstanceOf(LoginAttempt);
  });

  it("instantiates array nested schemas via hasMany", () => {
    const user = new User({
      loginAttempts: [
        { success: true, unixTimestampMs: 1 },
        { success: false, unixTimestampMs: 2 },
      ],
    });
    expect(user.loginAttempts[0]).toBeInstanceOf(LoginAttempt);
    expect(user.loginAttempts[1]).toBeInstanceOf(LoginAttempt);
  });

  it("handles two-level array nesting", () => {
    const blog = new Blog({
      posts: [
        {
          comments: [{ msg: "hi" }, { msg: "there" }],
        },
      ],
    });
    expect(blog.posts[0]).toBeInstanceOf(Post);
    expect(blog.posts[0].comments[0]).toBeInstanceOf(Comment);
  });

  it("accepts nullable variant values", () => {
    const w1 = new Wrapper({ result: null });
    expect(w1.result).toBeNull();
  });
});
