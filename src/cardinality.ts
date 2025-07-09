/** Cardinality constants and type for Type-A generic field builder. */

/**
* Unique symbol identifying a *single* value field (one).
*/
// Using a well-known description string helps debugging while preserving the
// `unique symbol` semantics required for nominal typing.
export const one: unique symbol = Symbol("type-a.one");

/**
* Unique symbol identifying an *array* (many) value field.
*/
export const many: unique symbol = Symbol("type-a.many");

/**
* Set of allowed cardinality markers.
*
*   - `typeof one` – scalar value
*   - `typeof many` – array value
*/
export type Cardinality = typeof one | typeof many;

// ---------------------------------------------------------------------------
// Convenience type aliases
// ---------------------------------------------------------------------------

// Re-export the **type** of each cardinality constant under the *same* name so
// that callers can write `Of<one, string>` instead of the more verbose
// `Of<typeof one, string>`.  TypeScript allows a value and a type declaration
// to share the same identifier as they inhabit separate namespaces.

export type one = typeof one;
export type many = typeof many;
