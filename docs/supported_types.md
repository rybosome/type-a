# Supported Types

This page demonstrates the six major type categories that **Type-A** supports out-of-the-box. Every example is a **live** test: each code block is executed in CI to guarantee that the snippet both compiles and behaves exactly as shown.

## 1. Primitives

The simplest use-case is validating JavaScript’s primitive types. The `is` option accepts one or more _constraints_ that must return `true` for valid values (or an error string otherwise).

```typescript test
import { Schema, one, typed as t, nonEmpty, atLeast } from "@rybosome/type-a";

class Person extends Schema.from({
  // A non-empty string
  name: one(t.string, { is: nonEmpty }),

  // A number that must be ≥ 18
  age: one(t.number, { is: atLeast(18) }),
}) {}

const p = new Person({ name: "Alice", age: 30 });

// The constraints passed, so no validation errors are returned
expect(p.validate()).toEqual([]);
```

## 2. Unions & Literals

Type unions restrict a field to one of several literal values at **compile-time**. Attach the built-in `aLiteral()` helper when you also want **runtime** validation.

```typescript test
import { Schema, one, many, typed as t } from "@rybosome/type-a";

// "draft" | "published" | "archived"
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
```

## 3. Nullability & Undefined

`Type A` doesn’t treat `null` and `undefined` as special cases – just include them in your union type. The `default` option marks a field as _optional_ and supplies a fallback when the caller omits the property or passes `undefined`.

```typescript test
import { Schema, one, many, typed as t } from "@rybosome/type-a";

class Profile extends Schema.from({
  // May be null; defaults to null when omitted
  nickname: one(t.string, { nullable: true, optional: true }),
  bio: one(t.string, { optional: true, default: "" }),
}) {}

const me = new Profile({ nickname: "Bob", bio: "" });

expect(me.nickname).toBe("Bob");
expect(me.bio).toBe("");

class Collection extends Schema.from({
  // A simple list of tags
  tags: many(t.string),

  // Exactly two elements: boolean followed by number
  pair: one(t.tuple(t.boolean, t.number)),
}) {}

const c = new Collection({ tags: ["a", "b"], pair: [true, 42] });

expect(c.pair).toEqual([true, 42]);
```

## 5. Nested Schemas

Schemas compose naturally – just pass another `Schema` class to `Of()` and **Type-A** recurses automatically when constructing, validating, and serializing.

```typescript test
import { Schema, one, typed as t, nonEmpty } from "@rybosome/type-a";

class Address extends Schema.from({
  street: one(t.string, { is: nonEmpty }),
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
```

## 6. Custom Types (via `serdes`)

For types like `Date` (which can’t be represented directly in JSON) attach a _serializer / deserializer_ tuple. The constructor runs the deserializer while `toJSON()` applies the serializer automatically.

```typescript test
import { Schema, one, many, typed as t } from "@rybosome/type-a";

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
expect(JSON.parse(JSON.stringify(e))).toEqual({ title: "Launch", when: iso });
```
