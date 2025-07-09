/** Cardinality constants and type for Type-A generic field builder. */

/**
 * Unique symbol identifying a *single* value field (one).
 */
// Using a well-known description string helps debugging while preserving the
// `unique symbol` semantics required for nominal typing.
export const one: unique symbol = Symbol("type-a.one");

export type one = typeof one;

/**
 * Unique symbol identifying an *array* (many) value field.
 */
export const many: unique symbol = Symbol("type-a.many");

export type many = typeof many;

/**
 * Set of allowed cardinality markers.
 *
 *   - `typeof one` – scalar value
 *   - `typeof many` – array value
 */
export type Cardinality = one | many;
