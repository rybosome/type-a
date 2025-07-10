import { describe, it, expect } from "vitest";

// Import *directly* from the v3 prototype modules (they are **not** re-exported
// through the package root yet – the migration branch keeps them side-by-side
// with the legacy implementation).
import { Schema } from "../src/v3/schema";
import { one } from "../src/v3/field";
import { t } from "../src/v3/typed";

/**
 * End-to-end checks for the `enum` and `serdes` `TypedSpec.kind`s introduced
 * in **Phase C2** of the v3 migration.
 *
 * The scenarios cover:
 *  - successful construction, validation and JSON round-trip
 *  - runtime validation failures for bad enum / serdes inputs
 *  - JSON-Schema generation for the new spec kinds
 */

describe("v3 – enum & serdes integration", () => {
  /* --------------------------------------------------------------------- */
  /* Enum scenario                                                         */
  /* --------------------------------------------------------------------- */

  enum Role {
    Admin = "admin",
    User = "user",
  }

  class Authz extends Schema.from({
    role: one(t.enum(Role), { described: "User role" }),
  }) {}

  it("accepts valid enum values and rejects invalid ones", () => {
    const ok = new Authz({ role: Role.Admin });
    expect(ok.validate()).toEqual([]);

    // Validation happens *after* construction – invalid values do not throw
    // immediately but surface via `validate()`.
    const bad = new Authz({ role: "superuser" as unknown as Role });
    expect(bad.validate()).toContain("role: expected one of admin, user");
  });

  it("emits correct JSON Schema for enum fields", () => {
    const schema = Authz.jsonSchema();

    // Narrow snapshot – only test the part added in this phase.
    expect(schema).toMatchObject({
      properties: {
        role: {
          type: "string",
          enum: ["admin", "user"],
          description: "User role",
        },
      },
      required: ["role"],
    });
  });

  /* --------------------------------------------------------------------- */
  /* Serdes scenario (Date <--> ISO 8601 string)                            */
  /* --------------------------------------------------------------------- */

  const serializeDate = (d: Date) => d.toISOString();
  const deserializeDate = (s: string) => new Date(s);

  class LoginAttempt extends Schema.from({
    success: one(t.boolean),
    timestamp: one(t.serdes(Date, t.string), {
      serdes: [serializeDate, deserializeDate],
      described: "ISO 8601 timestamp",
    }),
  }) {}

  it("deserializes raw JSON using the provided deserializer", () => {
    const raw = {
      success: true,
      timestamp: "2024-01-02T03:04:05.000Z",
    } as const;

    const { val, errs } = LoginAttempt.fromJSON(raw);

    expect(errs).toBeUndefined();
    expect(val).toBeInstanceOf(LoginAttempt);
    expect((val! as any).timestamp).toBeInstanceOf(Date);
    expect((val! as any).timestamp.toISOString()).toBe(raw.timestamp);
  });

  it("serializes in-memory values using the provided serializer", () => {
    const iso = "2030-05-06T07:08:09.000Z";
    const la = new LoginAttempt({ success: false, timestamp: iso });

    // After construction the `timestamp` getter exposes a `Date` instance …
    expect(la.timestamp).toBeInstanceOf(Date);

    // … and `toJSON()` converts it back to its raw string form via the custom
    // serializer.
    const json = la.toJSON();
    expect(json.timestamp).toBe(iso);
    expect(json.success).toBe(false);
  });

  it("rejects values that do not match the rawSpec type at construction time", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(
      () => new LoginAttempt({ success: true, timestamp: 1234 as any }),
    ).toThrow("timestamp: expected string");
  });

  it("emits JSON Schema that reflects the raw representation", () => {
    const schema = LoginAttempt.jsonSchema();

    expect(schema).toMatchObject({
      properties: {
        timestamp: {
          type: "string",
          description: "ISO 8601 timestamp",
        },
      },
    });
  });
});
