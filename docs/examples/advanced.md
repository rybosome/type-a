# Advanced Example – Orders & Products

This scenario chains together **nested schemas**, **maps**, **constraints**, and
**serdes** to showcase real-world composition.

```ts test
import { describe, it, expect } from "vitest";
import {
  Schema,
  one,
  many,
  typed as t,
  constraints as c,
} from "@rybosome/type-a";

// ────────────────────────────────────────────────────────────
// 1. Building block schemas
// ────────────────────────────────────────────────────────────
class User extends Schema.from({
  id: one(t.string, { is: c.nonEmpty }),
  name: one(t.string),
  email: one(t.string),
}) {}

class Product extends Schema.from({
  id: one(t.string),
  name: one(t.string),
  price: one(t.number, { is: c.atLeast(0) }),
  tags: many(t.string, { optional: true }),
  createdAt: one(t.serdes(Date, t.string), {
    serdes: [(d: Date) => d.toISOString(), (iso: string) => new Date(iso)],
  }),
}) {}

// ────────────────────────────────────────────────────────────
// 2. Order schema with nested & map fields
// ────────────────────────────────────────────────────────────
const Status = {
  pending: "pending",
  paid: "paid",
  shipped: "shipped",
} as const;

class Order extends Schema.from({
  id: one(t.string),
  user: one(User),
  items: one(t.map(t.string, t.number)), // productId -> quantity
  status: one(t.enum(Status)),
  createdAt: one(t.serdes(Date, t.string), {
    serdes: [(d: Date) => d.toISOString(), (iso: string) => new Date(iso)],
  }),
}) {}

// ────────────────────────────────────────────────────────────
// 3. End-to-end test
// ────────────────────────────────────────────────────────────

describe("Advanced example: Order workflow", () => {
  it("validates deeply nested data & serializes cleanly", () => {
    const order = new Order({
      id: "ord-1",
      user: { id: "u1", name: "Ada", email: "ada@example.com" },
      items: {
        p1: 2,
        p2: 1,
      },
      status: "paid",
      createdAt: "2025-07-04T12:00:00Z",
    });

    // No validation errors expected
    expect(order.validate()).toEqual([]);

    // Deeply nested classes are instantiated automatically
    expect(order.user).toBeInstanceOf(User);

    // Round-trip through JSON → plain object → back via constructor
    const json = JSON.parse(JSON.stringify(order));
    const order2 = new Order(json);
    expect(order2.validate()).toEqual([]);
  });
});
```

### Live demos

- Type-level view: _(auto-generated)_
- Runtime demo on StackBlitz: _(auto-generated)_

---

Return to [API reference](../api/entrypoints.md) for detailed docs on each
building block.
