/* ------------------------------------------------------------------ */
/* Relationship descriptor                                            */
/* ------------------------------------------------------------------ */
/**
 * Unique symbol used to brand {@link RelationshipDescriptor} instances at
 * runtime.  Exported so that helper functions in {@link Schema} can detect the
 * marker without relying on fragile `instanceof` checks (the object is a plain
 * literal).
 *
 * The symbol is *not* enumerable so it does not pollute `JSON.stringify` or
 * other reflective uses of the descriptor.
 */
export const RELATIONSHIP = Symbol("__type_a_relationship__");
