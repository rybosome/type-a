/**
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
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]?: string;
} & {
  summarize(): string[];
};

/**
 * Convenience alias for optional values.
 */
export type Maybe<T> = T | undefined;
