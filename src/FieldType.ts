// Shim that re-exports the canonical definitions from ./schema so external
// imports (`import { Of, FieldType } from "@rybosome/type-a"`) continue to
// work without duplicating code.

export { Of } from "./schema";
export type { FieldType } from "./schema";
