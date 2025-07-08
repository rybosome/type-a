# Supported Types

This page demonstrates the six major type categories that **Type-A** supports out-of-the-box. Every example is a **live** test: each code block is executed in CI to guarantee that the snippet both compiles and behaves exactly as shown.

## 1. Primitives

The simplest use-case is validating JavaScript’s primitive types. The `is` option accepts one or more _constraints_ that must return `true` for valid values (or an error string otherwise).

```typescript test
import { Schema, Of, nonEmpty, atLeast } from "@rybosome/type-a";

class Person extends Schema.from({
  // A non-empty string
  name: Of<string>({ is: nonEmpty }),

  // A number that must be ≥ 18
  age: Of<number>({ is: atLeast(18) }),
}) {}

const p = new Person({ name: "Alice", age: 30 });

// The constraints passed, so no validation errors are returned
expect(p.validate()).toEqual([]);
```

## 2. Unions & Literals

Type unions let you restrict a field to one of several literal values at **compile-time**. At runtime you can still attach a custom validator when extra guarantees are required.

```typescript test
import { Schema, Of } from "@rybosome/type-a";

// "draft" | "published" | "archived"
type PostState = "draft" | "published" | "archived";

class Post extends Schema.from({
  state: Of<PostState>({
    // Optional runtime guard – ensures only the listed states are accepted
    is: (s) =>
      s === "draft" || s === "published" || s === "archived"
        ? true
        : "invalid state",
  }),
}) {}

const post = new Post({ state: "draft" });

expect(post.state).toBe("draft");
```

## 3. Nullability & Undefined

`Type A` doesn’t treat `null` and `undefined` as special cases – just include them in your union type. The `default` option marks a field as _optional_ and supplies a fallback when the caller omits the property or passes `undefined`.

```typescript test
import { Schema, Of } from "@rybosome/type-a";

class Profile extends Schema.from({
  // May be null; defaults to null when omitted
  nickname: Of<string | null>({ default: null }),

  // Optional string – will fall back to the given default
  bio: Of<string | undefined>({ default: "" }),
}) {}

const me = new Profile({});

expect(me.nickname).toBeNull();
expect(me.bio).toBe("");
```

## 4. Arrays & Tuples

Arrays use the familiar `T[]` syntax while tuples can express _fixed_ or _variadic_ positions. Everything after the first rest element (`...`) is still type-checked.

```typescript test
import { Schema, Of } from "@rybosome/type-a";

class Collection extends Schema.from({
  // A simple list of tags
  tags: Of<string[]>(),

  // Exactly two elements: boolean followed by number
  pair: Of<[boolean, number]>(),
}) {}

const c = new Collection({ tags: ["a", "b"], pair: [true, 42] });

expect(c.pair).toEqual([true, 42]);
```

## 5. Nested Schemas

Schemas compose naturally – just pass another `Schema` class to `Of()` and **Type-A** recurses automatically when constructing, validating, and serializing.

```typescript test
import { Schema, Of, nonEmpty } from "@rybosome/type-a";

class Address extends Schema.from({
  street: Of<string>({ is: nonEmpty }),
  zip: Of<string>(),
}) {}

class User extends Schema.from({
  name: Of<string>(),
  address: Of(Address), // Nested schema
}) {}

const u = new User({
  name: "Bob",
  address: { street: "42 Main St", zip: "12345" },
});

expect(u.address.street).toBe("42 Main St");
```

## 6. Custom Types (via `serdes`)

For types like `Date` (which can’t be represented directly in JSON) attach a _serializer / deserializer_ tuple. The constructor runs the deserializer while `toJSON()` applies the serializer automatically.

```typescript test
import { Schema, Of } from "@rybosome/type-a";

const serializeDate = (d: Date) => d.toISOString();
const deserializeDate = (iso: string) => new Date(iso);

class Event extends Schema.from({
  title: Of<string>(),
  when: Of<Date, string>({ serdes: [serializeDate, deserializeDate] }),
}) {}

const iso = "2025-12-31T23:59:59.000Z";

// Pass the *raw* JSON value (`string`) through a compile-time cast.
const e = new Event({ title: "Launch", when: iso as unknown as never });

expect(e.when).toBeInstanceOf(Date);
expect(JSON.parse(JSON.stringify(e))).toEqual({ title: "Launch", when: iso });
```
