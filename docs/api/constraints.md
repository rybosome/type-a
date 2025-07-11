# Constraints

Constraints are reusable runtime predicates that can be attached to any field
via the `{ is: … }` option. They return `true` on success or an _error string_
that is collected by `schema.validate()`.

```typescript
import { describe, it, expect } from "vitest";
import { Schema, one, constraints as c, typed as t } from "@rybosome/type-a";

describe("constraints.nonEmpty & .atMost", () => {
  it("rejects invalid data", () => {
    class Comment extends Schema.from({
      body: one(t.string, { is: c.nonEmpty }),
      rating: one(t.number, { is: c.atMost(5) }),
    }) {}

    const invalid = new Comment({ body: "", rating: 10 });
    const errs = invalid.validate();
    expect(errs.length).toBe(2);
  });
});
```

Under the hood, a constraint is just a function `(v) => true | string`, so you
can author your own and compose them as needed.
