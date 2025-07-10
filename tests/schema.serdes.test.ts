import { describe, it, expect } from "vitest";

import { Schema, one } from "@rybosome/type-a";

import type { Serdes } from "@rybosome/type-a";

const serializeDate = (d: Date) => d.toISOString();
const deserializeDate = (s: string) => new Date(s);

class User extends Schema.from({
  name: one().of<string>({}),
  created: one().of<Serdes<Date, string>>({
    serdes: [serializeDate, deserializeDate],
  }),
}) {}

describe("Schema property custom (de)serialisers", () => {
  it("round-trips Date <-> string correctly", () => {
    const iso = "2025-01-02T03:04:05.000Z";
    const u = new User({ name: "Alice", created: iso });

    // Constructor should convert string → Date
    expect(u.created).toBeInstanceOf(Date);
    expect((u.created as Date).toISOString()).toBe(iso);

    // toJSON should convert Date → string
    const json = u.toJSON();
    expect(json).toEqual({ name: "Alice", created: iso });
  });

  it("falls back to default behaviour when no serdes supplied", () => {
    class Foo extends Schema.from({ value: one().of<number>({}) }) {}
    const f = new Foo({ value: 42 });
    expect(f.toJSON()).toEqual({ value: 42 });
  });

  // Intentionally mismatched serializer/deserializer types – should NOT type-check
  // @ts-expect-error – Wrong serdes types
  void one().of<Serdes<Date, number>>({
    serdes: [(_: Date) => 123, (s: string) => new Date(s)],
  });
});
