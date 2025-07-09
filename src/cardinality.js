/** Cardinality constants and type for Type-A generic field builder. */
/**
 * Unique symbol identifying a *single* value field (one).
 */
// Using a well-known description string helps debugging while preserving the
// `unique symbol` semantics required for nominal typing.
export const one = Symbol("type-a.one");
/**
 * Unique symbol identifying an *array* (many) value field.
 */
export const many = Symbol("type-a.many");
