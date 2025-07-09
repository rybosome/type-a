/* -------------------------------------------------------------------------- */
/* Generic-only `Of` field builder                                             */
/* -------------------------------------------------------------------------- */

import type { Cardinality, one, many } from "@src/cardinality";
import type { _NestedSchemaOf, nested } from "@src/nested";
import type { LogicalConstraint } from "@src/types";
import type { SchemaClass } from "@src/schema";
import type { Typeable } from "@src/types";

import type { FieldType } from "@src/schema";

/* -------------------------------------------------------------------------- */
/* Helper types                                                                */
/* -------------------------------------------------------------------------- */

/** If `T` is `nested<S>` unwrap to the *constructed* schema value, otherwise
 * leave untouched. */
type UnwrapNested<T> =
  T extends nested<infer S> ? InstanceType<_NestedSchemaOf<T>> : T;

/** Derive the *final* value type stored in the field based on its cardinality
 * and (possibly nested) element type. */
type FieldValue<C extends Cardinality, T> = C extends typeof one
  ? UnwrapNested<T>
  : C extends typeof many
    ? UnwrapNested<T>[]
    : never;

/**
 * Options object accepted by the `Of<C, T>()` builder. Most properties map
 * 1-to-1 to {@link FieldType}.  Nested schemas are now declared exclusively via
 * the {@link with} helper – therefore **no** constructor is accepted here.
 */
export interface FieldOpts<C extends Cardinality, T> {
  default?: FieldValue<C, T> | (() => FieldValue<C, T>);
  is?:
    | LogicalConstraint<NonNullable<FieldValue<C, T>>>
    | LogicalConstraint<NonNullable<FieldValue<C, T>>>[];
  serdes?: [
    (val: FieldValue<C, T>) => unknown,
    (raw: unknown) => FieldValue<C, T>,
  ];
  variantClasses?: SchemaClass[];
}

/* -------------------------------------------------------------------------- */
/* Builder implementation                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Generic-only field builder.
 *
 * ```ts
 * class User extends Schema.from({
 *   name:  Of<one, string>({}),
 *   tags:  Of<many, string>({}),
 *   posts: with(Post).Of<many, nested<Post>[]?>({}),
 * });
 * ```
 */
export function Of<C extends Cardinality, T extends Typeable>(
  opts: FieldOpts<C, T>,
): FieldType<FieldValue<C, T>> {
  // Assemble the descriptor skeleton. `__t` and `value` are *phantom*
  // properties used solely for type inference – they carry no runtime data.
  const field: FieldType<FieldValue<C, T>> = {
    __t: undefined as unknown as FieldValue<C, T>,
    value: undefined as unknown as FieldValue<C, T>,
  } as FieldType<FieldValue<C, T>>;

  // Copy recognised options directly – lossy cast is safe because the helper
  // type guarantees compatibility.
  Object.assign(field as any, opts);

  return field;
}
