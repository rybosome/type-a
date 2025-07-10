/* Legacy builder functions removed — retains only shared FieldOpts type for API v3 */

import type {
  LogicalConstraint,
  SchemaClass,
  Typeable,
  Serdes,
} from "@src/types";

/**
 * Options object accepted by v3 {@link one} / {@link many} builders.
 * Retained here solely for type-sharing — all runtime builder logic has moved
 * to `src/v3/field.ts`.
 */
export interface FieldOpts<T extends Typeable, R = T> {
  /** Optional default value or thunk returning the value. */
  default?: T | (() => T);

  /** Runtime validator (or array of validators). */
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];

  /**
   * Custom serialisation/deserialisation tuple.  See {@link Serdes}.
   */
  serdes?: Serdes<T, R>;

  /**
   * Explicit discriminated-union support. When provided **Type-A** picks the
   * constructor at runtime based on the incoming raw object’s discriminator
   * value.
   */
  variantClasses?: SchemaClass[];
}

// NOTE: All legacy builder implementations (`one().of`, `many().of`) were
// removed as part of the v3 migration. Attempting to import them will now
// result in a compile-time error.
