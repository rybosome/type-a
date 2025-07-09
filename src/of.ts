/* -------------------------------------------------------------------------- */
/* Generic-only `Of` field builder                                             */
/* -------------------------------------------------------------------------- */

import type { Cardinality, one, many } from "@src/cardinality";
import type { _NestedSchemaOf, nested } from "@src/nested";
import type { LogicalConstraint } from "@src/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SchemaClass } from "@src/schema";
import type { Typeable } from "@src/types";

import type { FieldType } from "@src/schema";

/* -------------------------------------------------------------------------- */
/* Helper types                                                                */
/* -------------------------------------------------------------------------- */

/** If `T` is `nested<S>` unwrap to the *constructed* schema value, otherwise
 * leave untouched. */
// ---------------------------------------------------------------------------
// `nested<S>` unwrapping helpers                                            
// ---------------------------------------------------------------------------

/** Unwrap a single `nested<S>` wrapper to its **instance** type. */
type _UnwrapNestedSingle<T> = T extends nested<infer S>
  ? InstanceType<_NestedSchemaOf<T>>
  : T;

/**
* Unwrap `nested<S>` that may be wrapped in a *single* array layer. If `T` is
* itself an array we unwrap the **element** type only – the caller is
* responsible for adding an outer array when the field cardinality is
* `many`.
*/
type _UnwrapNestedMaybeArray<T> = T extends (infer U)[]
  ? _UnwrapNestedSingle<U>
  : _UnwrapNestedSingle<T>;

/** Derive the final in-memory value for the field based on cardinality and
* (possibly nested) element type. */
type FieldValue<C extends Cardinality, T> = C extends typeof one
  ? _UnwrapNestedSingle<T>
  : C extends typeof many
    ? _UnwrapNestedMaybeArray<T>[]
    : never;

/**
 * Options object accepted by the `Of<C, T>()` builder. Most properties map
 * 1-to-1 to {@link FieldType}.  Nested schemas are now declared exclusively via
 * the {@link with} helper – therefore **no** constructor is accepted here.
 */
export interface FieldOpts<C extends Cardinality, T, R = FieldValue<C, T>> {
  default?: FieldValue<C, T> | (() => FieldValue<C, T>);
  /**
   * Validation predicate(s) applied to the *element* type of the field. When
   * the cardinality is `many` the runtime iterates over the array and applies
   * the constraint to each value individually.  For `one` the predicate is
   * executed directly on the scalar value.
   */
  is?:
    | LogicalConstraint<NonNullable<_UnwrapNestedMaybeArray<T>>>
    | LogicalConstraint<NonNullable<_UnwrapNestedMaybeArray<T>>>[];
  /**
   * Custom serializer/​deserializer tuple. When provided the **first** element
   * converts the in-memory value to the raw representation (`val → raw`) while
   * the second performs the inverse transformation (`raw → val`).
   */
  serdes?: [(val: FieldValue<C, T>) => R, (raw: R) => FieldValue<C, T>];

  /** Variant-union support – same semantics as legacy API. */
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

// ───────────────────────────────────────────────────────────────────────────
// Overloads – the return type *differs* when a `default` value is supplied.
// ───────────────────────────────────────────────────────────────────────────

// 1. **No options** (caller passed the ergonomic `[]` sentinel)
export function Of<C extends Cardinality, T extends Typeable>(
  opts: [],
): Omit<FieldType<FieldValue<C, T>>, 'default'>;

// 2. **Without default**
export function Of<C extends Cardinality, T extends Typeable>(
  opts: {
    is?:
      | LogicalConstraint<NonNullable<_UnwrapNestedMaybeArray<T>>>
      | LogicalConstraint<NonNullable<_UnwrapNestedMaybeArray<T>>>[];
    variantClasses?: SchemaClass[];
  },
): Omit<FieldType<FieldValue<C, T>>, 'default'>;

// 3. **With default** (makes constructor input optional)
export function Of<C extends Cardinality, T extends Typeable>(
  opts: {
    default: FieldValue<C, T> | (() => FieldValue<C, T>);
    is?:
      | LogicalConstraint<NonNullable<_UnwrapNestedMaybeArray<T>>>
      | LogicalConstraint<NonNullable<_UnwrapNestedMaybeArray<T>>>[];
    variantClasses?: SchemaClass[];
  },
): FieldType<FieldValue<C, T>> & {
  default: FieldValue<C, T> | (() => FieldValue<C, T>);
};

// Implementation ----------------------------------------------------------------

export function Of<C extends Cardinality, T extends Typeable>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: any,
) {
  // Interpret the `[]` sentinel as an empty options object for ergonomics.
  const normalized = Array.isArray(opts) ? {} : opts;

  // Construct the skeleton descriptor.  The phantom `__t` and `value`
  // properties exist *solely* for the type-system – they carry no runtime data.
  const field: FieldType<FieldValue<C, T>> = {
    __t: undefined as unknown as FieldValue<C, T>,
    value: undefined as unknown as FieldValue<C, T>,
  } as FieldType<FieldValue<C, T>>;

  // Shallow-copy the supplied options.  This is safe because callers can only
  // pass recognised keys thanks to the overload signatures above.
  Object.assign(field as any, normalized);

  return field as any;
}
