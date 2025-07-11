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
