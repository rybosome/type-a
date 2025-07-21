# Serdes (Custom Serializers / Deserializers)

When you need a field to _deserialize_ from one type but _expose_ a richer
runtime class, use the `t.serdes()` descriptor.

```typescript
import { describe, it, expect } from "vitest";
import { Schema, one, typed as t } from "@rybosome/type-a";

describe("Date ISO serdes", () => {
  it("round-trips through JSON", () => {
    const toIso = (d: Date) => d.toISOString();
    const fromIso = (iso: string) => new Date(iso);

    class Event extends Schema.from({
      when: one(t.serdes(Date, t.string), { serdes: [toIso, fromIso] }),
    }) {}

    const iso = "2025-12-31T23:59:59.000Z";
    const e = new Event({ when: iso });
    const json = JSON.parse(JSON.stringify(e));
    expect(json.when).toBe(iso);
    expect(e.when).toBeInstanceOf(Date);
  });
});
```

`serdes` pairs work symmetrically – the first function _serializes_ runtime
values for JSON, the second _parses_ raw input during construction.

## Nested Schemas

`serdes` works exactly the same when the field lives inside **another**
`Schema`. No extra configuration is required – nested instances are
constructed automatically and (de)serializers are applied during the usual
`constructor` / `toJSON()` flow.

```typescript
import { describe, it, expect } from "vitest";
import { Schema, one, typed as t } from "@rybosome/type-a";

// ISO-8601 ↔ Date helpers reused across many docs examples
const toIso = (d: Date) => d.toISOString();
const fromIso = (iso: string) => new Date(iso);

class Event extends Schema.from({
  when: one(t.serdes(Date, t.string), { serdes: [toIso, fromIso] }),
}) {}

class Wrapper extends Schema.from({
  event: one(Event),
}) {}

describe("Nested serdes round-trip", () => {
  it("deserialises JSON and re-serialises back identically", () => {
    const iso = "2025-12-25T00:00:00.000Z";

    // Construct Wrapper from plain JSON.
    const w = new Wrapper({ event: { when: iso } });

    // Runtime value is a Date inside the nested Event instance.
    expect(w.event.when).toBeInstanceOf(Date);
    expect((w.event.when as Date).toISOString()).toBe(iso);

    // Serialise back to JSON.
    const json = w.toJSON();
    expect(json).toEqual({ event: { when: iso } });
  });
});
```

> Because nested schemas are treated like any other field, you can freely
> combine `serdes` with arrays, sets, maps, unions, and deeper nesting levels –
> everything **just works**.
