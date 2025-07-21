import { describe, it, expect } from "vitest";

import { Schema, one, typed as t } from "@rybosome/type-a";

// Simple ISO-8601 ↔ Date pair used in all examples
const toIso = (d: Date) => d.toISOString();
const fromIso = (iso: string) => new Date(iso);

// ---------------------------------------------------------------------------
// Nested serdes setup
// ---------------------------------------------------------------------------

class Inner extends Schema.from({
  when: one(t.serdes(Date, t.string), { serdes: [toIso, fromIso] }),
}) {}

class Outer extends Schema.from({
  inner: one(Inner),
}) {}

describe("Nested schema serdes", () => {
  it("round-trips raw JSON ↔ runtime instances", () => {
    const iso = "2025-07-21T12:00:00.000Z";

    // Construct using raw JSON input.
    const o = new Outer({ inner: { when: iso } });

    // Ensure runtime value is properly deserialised.
    expect(o.inner.when).toBeInstanceOf(Date);
    expect((o.inner.when as Date).toISOString()).toBe(iso);

    // Serialise back to JSON – should mirror the original structure.
    const json = o.toJSON();
    expect(json).toEqual({ inner: { when: iso } });
  });
});
