import { describe, it, expect } from "vitest";

import { Schema, Of, one, many, nested } from "@rybosome/type-a";

class LoginAttempt extends Schema.from({
  success: Of<one, boolean>({}),
  unixTimestampMs: Of<one, number>({}),
}) {}

class LoginRecord extends Schema.from({
  loginAttempt: Of<one, nested<LoginAttempt>>({ schemaClass: LoginAttempt }),
}) {}

class User extends Schema.from({
  loginAttempts: Of<many, nested<LoginAttempt>>({ schemaClass: LoginAttempt }),
}) {}

class Comment extends Schema.from({ msg: Of<one, string>({}) }) {}

class Post extends Schema.from({
  comments: Of<many, nested<Comment>>({ schemaClass: Comment }),
}) {}

class Blog extends Schema.from({
  posts: Of<many, nested<Post>>({ schemaClass: Post }),
}) {}

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
});
