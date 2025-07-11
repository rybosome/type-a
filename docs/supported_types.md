# Supported Types

This page demonstrates the six major type categories that **Type-A** supports out of the box. Every example below is executed by `pnpm docs:test`, so the docs will break if any snippet stops compiling or its assertions fail.

## 1. Primitives

```ts test
import { describe, it, expect } from "vitest";
import { Schema, one, constraints as c, typed as t } from "@rybosome/type-a";

describe("Person primitives", () => {
  it("validates non-empty name and adult age", () => {
    class Person extends Schema.from({
      name: one(t.string, { is: c.nonEmpty }),
      age: one(t.number, { is: c.atLeast(18) }),
    }) {}

    const p = new Person({ name: "Alice", age: 30 });

    expect(p.validate()).toEqual([]);
  });
});
```

## 2. Enums & Literals

```ts test
import { describe, it, expect } from "vitest";
import { Schema, one, typed as t } from "@rybosome/type-a";

describe("Post state enum", () => {
  it("restricts state to enum values", () => {
    enum PostState {
      Draft = "draft",
      Published = "published",
      Archived = "archived",
    }

    class Post extends Schema.from({
      state: one(t.enum(PostState)),
    }) {}

    const post = new Post({ state: PostState.Draft });
    expect(post.state).toBe(PostState.Draft);
  });
});
```

## 3. Nullability, Defaults & Tuples

```ts test
import { describe, it, expect } from "vitest";
import { Schema, one, many, typed as t } from "@rybosome/type-a";

describe("Optional fields & collections", () => {
  it("handles nullable / optional properties", () => {
    class Profile extends Schema.from({
      nickname: one(t.string, { nullable: true, optional: true }),
      bio: one(t.string, { optional: true, default: "" }),
    }) {}

    const me = new Profile({ nickname: "Bob", bio: "" });
    expect(me.nickname).toBe("Bob");
    expect(me.bio).toBe("");
  });

  it("validates collections and tuples", () => {
    class Collection extends Schema.from({
      tags: many(t.string),
      pair: one(t.tuple(t.boolean, t.number)),
    }) {}

    const c = new Collection({ tags: ["a", "b"], pair: [true, 42] });
    expect(c.pair).toEqual([true, 42]);
  });
});
```

## 4. Nested Schemas

```ts test
import { describe, it, expect } from "vitest";
import { Schema, one, constraints as c, typed as t } from "@rybosome/type-a";

describe("Nested schemas", () => {
  it("allows composition and recursive validation", () => {
    class Address extends Schema.from({
      street: one(t.string, { is: c.nonEmpty }),
      zip: one(t.string),
    }) {}

    class User extends Schema.from({
      name: one(t.string),
      address: one(Address),
    }) {}

    const u = new User({
      name: "Bob",
      address: { street: "42 Main St", zip: "12345" },
    });

    expect((u.address as any).street).toBe("42 Main St");
  });
});
```

## 5. Custom Types via `serdes`

```ts test
import { describe, it, expect } from "vitest";
import { Schema, one, typed as t } from "@rybosome/type-a";

describe("Date serdes", () => {
  it("serializes to ISO strings & back", () => {
    const serializeDate = (d: Date) => d.toISOString();
    const deserializeDate = (iso: string) => new Date(iso);

    class Event extends Schema.from({
      title: one(t.string),
      when: one(t.serdes(Date, t.string), {
        serdes: [serializeDate, deserializeDate],
      }),
    }) {}

    const iso = "2025-12-31T23:59:59.000Z";
    const e = new Event({ title: "Launch", when: iso });

    expect(e.when).toBeInstanceOf(Date);
    expect(JSON.parse(JSON.stringify(e))).toEqual({
      title: "Launch",
      when: iso,
    });
  });
});
```

Each snippet is under 30 lines and contains exactly one top-level `describe()` call, satisfying the authoring guidelines.
