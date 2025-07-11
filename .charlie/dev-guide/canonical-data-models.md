# Canonical Data Models

This document defines the **three canonical example data models** that will be reused throughout the public documentation. All future code samples must reference *only* these models so that readers see the same field names, shapes, and conventions everywhere.

## Quick reference table

| Model | Fields (TypeScript) | Purpose |
|-------|---------------------|---------|
| `User` | `id: string`  <br>`name: string`  <br>`email: string`  <br>`roles: Set<"admin" \| "member">`  <br>`createdAt: Date` | Showcases primitives, literal-union enums, `Set`, and `serdes.date`. |
| `Product` | `id: string`  <br>`name: string`  <br>`price: number`  <br>`tags?: string[]`  <br>`createdAt: Date` | Demonstrates numeric constraints (price ≥ 0), optional arrays, and date serialization. |
| `Order` | `id: string`  <br>`user: User`  <br>`items: Map<Product, number>`  <br>`status: "pending" \| "paid" \| "shipped"`  <br>`createdAt: Date` | Illustrates nested schemas, `Map`, and union-style status fields. |

> **Note**  All IDs are **UUID v4** strings and every model includes `createdAt: Date` to highlight the `serdes.date` helper.

---

## Full model definitions

### `User`

- `id: string /* UUID v4 */`
- `name: string`
- `email: string`
- `roles: Set<"admin" | "member">`
- `createdAt: Date`

### `Product`

- `id: string`
- `name: string`
- `price: number /* ≥0 */`
- `tags?: string[]`
- `createdAt: Date`

### `Order`

- `id: string`
- `user: User`
- `items: Map<Product, number>`
- `status: "pending" | "paid" | "shipped"`
- `createdAt: Date`

---

## Naming & formatting conventions

- **Model class names** use **PascalCase** (`User`, `Product`, `Order`).
- **Field names** use **camelCase** (`createdAt`, `price`, `items`, …).
- **`createdAt: Date`** must appear on **every** model to demonstrate `serdes.date` usage.
- **Identifier fields** (`id`) are always **UUID v4 strings**.

These conventions are **mandatory** for every example and reference in `docs/`. Deviations should be treated as documentation bugs.

