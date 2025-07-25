import { describe, it, expect } from "vitest";
import { Schema, one, typing as t } from "@rybosome/type-a";

const serializeDate = (d: Date) => d.toISOString();
const deserializeDate = (s: string) => new Date(s);

class User extends Schema.from({
  name: one(t.string),
  created: one(t.serdes(Date, t.string), {
    serdes: [serializeDate, deserializeDate],
  }),
}) {}

describe("Schema property custom (de)serialisers", () => {
  it("round-trips Date <-> string correctly", () => {
    const iso = "2025-01-02T03:04:05.000Z";
    const u = new User({ name: "Alice", created: iso });

    expect(u.created).toBeInstanceOf(Date);
    expect((u.created as Date).toISOString()).toBe(iso);

    const json = u.toJSON();
    expect(json).toEqual({ name: "Alice", created: iso });
  });

  it("falls back to default behaviour when no serdes supplied", () => {
    class Foo extends Schema.from({ value: one(t.number) }) {}
    const f = new Foo({ value: 42 });
    expect(f.toJSON()).toEqual({ value: 42 });
  });
});
