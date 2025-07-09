/* ------------------------------------------------------------- */
/* Re-export public Type-A API                                    */
/* ------------------------------------------------------------- */

export * from "./constraints";

// Core Schema runtime & associated helper types (minus legacy Of)
export { Schema } from "./schema";
export type { SchemaClass, RelationshipDescriptor } from "./schema";

// New generic-only field builder & supporting helpers
export { Of } from "./of";
export { one, many } from "./cardinality";
export type { Cardinality } from "./cardinality";
export { nested } from "./nested";
export type { nested as Nested } from "./nested";

// Misc utilities & internal types
export * from "./types";
export * from "./registry";

// Conditional helpers
export * from "./conditionals/utils";
