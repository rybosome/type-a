import { describe, it, expect } from "vitest";

import { Schema, Of } from "@rybosome/type-a";

const serializeDate = (d: Date) => d.toISOString();
const deserializeDate = (s: string) => new Date(s);

class User extends Schema.from({
  name: Of<string>(),
  created: Of<Date, string>({ serdes: [serializeDate, deserializeDate] }),
}) {}

describe("Schema property custom (de)serialisers", () => {
  it("round-trips Date <-> string correctly", () => {
    const iso = "2025-01-02T03:04:05.000Z";
    const u = new User({ name: "Alice", created: iso as unknown as never });

    // Constructor should convert string → Date
    expect(u.created as Date).toBeInstanceOf(Date);
    expect((u.created as Date).toISOString()).toBe(iso);

    // toJSON should convert Date → string
    const json = u.toJSON();
    expect(json).toEqual({ name: "Alice", created: iso });
  });

  it("falls back to default behaviour when no serdes supplied", () => {
    class Foo extends Schema.from({ value: Of<number>() }) {}
    const f = new Foo({ value: 42 });
    expect(f.toJSON()).toEqual({ value: 42 });
  });

  // @ts-expect-error – mismatched serializer/deserializer types should error
  const _badField = Of<Date, number>({
    serdes: [(d: Date) => 123, (s: string) => new Date(s)],
  });
});
