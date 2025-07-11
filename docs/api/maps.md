# Maps & Records

Need to model a dynamic key–value store? Use `t.map(keyDesc, valueDesc)`.
It supports both JavaScript `Map` instances _and_ plain object-literals at
runtime.

```typescript test
import { describe, it, expect } from "vitest";
import { Schema, one, typed as t } from "@rybosome/type-a";

describe("t.map() descriptor", () => {
  it("keeps Map instances intact", () => {
    class Flags extends Schema.from({
      flags: one(t.map(t.string, t.boolean)),
    }) {}

    const raw = new Map<string, boolean>([
      ["dark", true],
      ["beta", false],
    ]);

    const f = new Flags({ flags: raw });
    expect(f.flags).toBe(raw);
  });
});
```

> Nested `t.map()` compositions are fully supported and validated recursively.
