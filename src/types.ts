/**
 * Marker interface implemented by every {@link Schema} instance. Using a
 * branded property instead of the broad `object` type lets us distinguish
 * *actual* schema objects from arbitrary runtime objects while still allowing
 * nested-schema support.
 */
export interface SchemaInstance {
  // Branded discriminator – never assigned by consumers.
  readonly __isSchemaInstance: true;
}

/**
 * The subset of values that may appear in a schema field.
 *
 * • Primitives – `string | number | boolean | null | undefined`
 * • Nested schema instances – {@link SchemaInstance}
 *
 * **Note:** Arrays, functions, class instances *other than* schemas, and plain
 * objects are *not* considered `Typeable`.  Those more complex shapes should
 * instead be modelled as dedicated `Schema` classes so that validation and
 * serialisation rules remain explicit.
 */
// Primitive-or-schema scalar allowed in a field
type ScalarTypeable =
  | string
  | number
  | boolean
  | null
  | undefined
  | SchemaInstance;

/**
 * Permitted runtime value for a field. Either a single scalar (primitive or
 * `SchemaInstance`) **or** a flat array of those scalars.  Nested (2-dimensional)
 * arrays are intentionally disallowed; model such structures with an
 * explicit `Schema` so validation remains explicit.
 */
/**
 * Tuple (ordered, fixed-index) value composed entirely of *scalar* Typeable
 * members.  Variadic tuples such as `[T, ...T[]]` are also covered because the
 * repeated tail `T[]` portion still satisfies the scalar-array restriction.
 *
 * The empty tuple (`[]`) is intentionally allowed – while perhaps not useful in
 * practice it keeps the definition mathematically complete and prevents
 * surprises when generic tuples collapse to `never[]` or `[]` in edge-cases.
 */
type TupleTypeable =
  | readonly []
  | readonly [ScalarTypeable, ...ScalarTypeable[]];

/**
 * Permitted runtime value for a field. Either a single scalar (primitive or
 * `SchemaInstance`), a *flat* array **or** a *flat* tuple of those scalars.
 *
 * Tuples are treated as a first-class citizen so that fields like
 * `Of<[boolean, number]>()` and `Of<[string, ...string[]]>()` work seamlessly
 * without loosening the element-type guarantees.  Nested (2-dimensional)
 * arrays/tuples are **not** permitted – model such structures explicitly with a
 * dedicated `Schema` so that validation and serialisation rules remain
 * explicit.
 */
/* ------------------------------------------------------------------ */
/* Map & Record support (recursive)                                    */
/* ------------------------------------------------------------------ */

/**
 * Permitted runtime value for a field **including** arbitrary map/record
 * collections.
 *
 * The recursive references are safe because they appear in *property*
 * positions (`{ [key: string]: … }`) or within the value slot of `Map`.  This
 * avoids the illegal direct self-reference case that TypeScript rejects.
 */
export type Typeable =
  | ScalarTypeable
  | ScalarTypeable[]
  | TupleTypeable
  | { [key: string]: Typeable }
  | Map<unknown, Typeable>;

/* ------------------------------------------------------------------ */
/* NEW: helpers for nested Schema classes                              */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Extract the *constructed* (output) type of a Schema class.
 *
 *   class User extends Schema<…> {}
 *   type UserModel = OutputOf<typeof User>;   //  → User & ValueMap<…>
 */
export type OutputOf<S> = S extends new (...args: any[]) => infer O ? O : never;

/**
 * Extract the *constructor-input* (raw value map) type of a Schema class.
 *
 *   type RawUser = InputOf<typeof User>;      //  → InputValueMap<…>
 */
export type InputOf<S> = S extends new (input: infer I) => any ? I : never;

/**
 * A constraint over a Typeable value indicating that it must adhere to the given
 * function's properties.
 */
export type LogicalConstraint<T extends Typeable> = (val: T) => true | string;

/**
 * Discriminated union carrying either a valid value (`val`) or an error container
 * (`errs`).  Exactly one of the two is defined.
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
