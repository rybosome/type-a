/ **
 * Generic utility/result helpers.
 *
 * Result – discriminated union carrying either a valid value (`val`) or an
 *          error container (`errs`). Exactly one of the two is defined.
 * ErrLog  – per-field error map (string | undefined) with a `summarize`
 *           helper returning all collected error strings.
 * Maybe   – simple optional/nullable alias.
 */

/**
 * Discriminated result wrapper.
 */
export type Result<V, E> =
  | { val: V; errs: undefined }
  | { val: undefined; errs: E };

/**
 * Error-aggregation helper. Produces the same keys as the validated input
 * (methods are ignored) and exposes a `summarize()` method that returns all
 * collected error strings.
 */
export type ErrLog<T> = {
  // Exclude function properties
  [K in keyof T as T[K] extends (...args: never[]) => unknown
    ? never
    : K]?: string;
} & {
  summarize(): string[];
};

/**
 * Convenience alias representing the same shape returned by `Schema.tryNew`.
 * On success `val` is provided, on failure `errs` is populated.
 */
export type Maybe<T> = Result<T, ErrLog<T>>;
