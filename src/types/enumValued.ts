/**
 * Runtime wrapper produced by {@link enumValued}.  The wrapper carries – at
 * **both** type- and runtime – the list of values extracted from the enum so
 * that:
 *
 *   • TypeScript sees a phantom type parameter (`__v`) equal to the literal
 *     union of `E[keyof E]` (e.g. "ok" | "error").
 *   • The runtime value exposes the extracted `values` array which is used by
 *     `Schema` to validate inputs.
 *
 * A unique symbol property (`enumValuedBrand`) is included so the generic
 * implementation of `Of()` can reliably detect the wrapper at runtime without
 * risk of collision with user-supplied objects.
 */

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

// A globally-unique symbol key so that runtime detection is fast and safe.
export const enumValuedBrand = Symbol.for("@type-a/enumValued");

/**
 * Internal branded interface.  The public surface area consists of the
 * `values` array only; the brand and phantom property are intentionally
 * non-enumerable implementation details.
 */
export interface EnumValuedWrapper<E extends Record<string, string | number>> {
  /** Brand used for runtime detection */
  readonly [enumValuedBrand]: true;

  /**
   * Concrete enum values (e.g. `["ok", "error"]`).  Stored so `Schema` can
   * check inputs *without* having to keep a reference to the original enum
   * object itself (numbers are uniqued bi-directionally in TS enums which can
   * be confusing at runtime).
   */
  readonly values: readonly E[keyof E][];

  /**
   * Phantom helper so `EnumValuedWrapper<E>["__v"]` is exactly the literal
   * union of the enum’s values.  Never exists at runtime – stripped by `tsc`.
   */
  readonly __v?: E[keyof E];
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Capture an enum’s values for later runtime validation **and** expose the
 * literal union type of those values to the TypeScript type system.
 *
 * Example:
 * ```ts
 * enum Status { OK = "ok", ERROR = "error" }
 *
 * // Compile-time:  { __v?: "ok" | "error" }
 * // Runtime:       { values: ["ok", "error"], [brand]: true }
 * const wrapped = enumValued(Status);
 * ```
 */
export function enumValued<E extends Record<string, string | number>>(
  e: E,
): EnumValuedWrapper<E> {
  // Extract *unique* values.  Reverse-mapped numeric enums emit both numeric
  // and string keys – `typeof foo === "number"` – we’re only interested in
  // the primitive values accessible to callers.
  const vals = Array.from(new Set(Object.values(e))) as E[keyof E][];

  return {
    // Non-enumerable by default so userland `console.log` remains clean.
    [enumValuedBrand]: true,
    values: vals,
  } as EnumValuedWrapper<E>;
}
