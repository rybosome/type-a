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
 * The subset of values that may appear in a scalar schema field.
 */
type ScalarTypeable =
  | string
  | number
  | boolean
  | bigint
  | null
  | undefined
  | SchemaInstance;

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
 * Permitted runtime value for a field. Either a:
 *   - single scalar (primitive or `SchemaInstance`)
 *   - a *flat* array
 *   - a *flat* tuple
 *   - a record or map where keys and values are Typeable
 */
export type Typeable =
  | ScalarTypeable
  | ScalarTypeable[]
  | TupleTypeable
  | { [key: string]: Typeable }
  | Map<unknown, Typeable>;

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

/* ------------------------------------------------------------------ */
/* Variant                                                             */
/* ------------------------------------------------------------------ */

/**
 * Utility helper that converts a list/tuple of {@link Schema} classes into a
 * union of their **constructed** (output) value types.  Intended for use with
 * {@link Schema.Of} when building explicit discriminated unions:
 *
 * ```ts
 * class A extends Schema.from({ kind: Of<'A'>() }) {}
 * class B extends Schema.from({ kind: Of<'B'>() }) {}
 *
 * type AorB = DiscriminatedUnion<[typeof A, typeof B]>;
 * //        ^ equivalent to  OutputOf<typeof A> | OutputOf<typeof B>
 * ```
 *
 * Internally this is merely an alias over `OutputOf<…>` – no additional runtime
 * behaviour is attached.  Validation, serialisation, and re-hydration are
 * handled by the {@link Schema} logic once the corresponding `schemaClasses`
 * array is supplied to `Of()`.
 */

export type Variant<
  Classes extends readonly { new (input: any): SchemaInstance }[],
> = OutputOf<Classes[number]>;

/**
 * Deprecated alias kept for smoother migration. Instantiating the runtime
 * value throws immediately with a descriptive error so that code relying on
 * the *value* (rather than the type) fails loudly.
 */

export const DiscriminatedUnion = new Proxy(() => {}, {
  apply() {
    throw new Error(
      "`DiscriminatedUnion` has been renamed to `Variant`. Update your imports and generics accordingly.",
    );
  },
}) as never;

// Keep type alias for compile-time back-compatibility

export type DiscriminatedUnion<
  C extends readonly { new (input: any): SchemaInstance }[],
> = Variant<C>;
