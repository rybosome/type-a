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
  | bigint
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
  | Map<unknown, Typeable>
  // Allow arbitrary object instances (Date, URL, custom classes) so that
  // callers can plug custom (de)serialisers without fighting the type
  // system.
  | (object & { [K in never]: never });

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
/* Relationship descriptor                                            */
/* ------------------------------------------------------------------ */

/**
 * Unique symbol used to brand {@link RelationshipDescriptor} instances at
 * runtime.  Exported so that helper functions in {@link Schema} can detect the
 * marker without relying on fragile `instanceof` checks (the object is a plain
 * literal).
 *
 * The symbol is *not* enumerable so it does not pollute `JSON.stringify` or
 * other reflective uses of the descriptor.
 */
export const RELATIONSHIP = Symbol("__type_a_relationship__");

/** Cardinality variants supported by {@link RelationshipDescriptor}. */
export type RelationshipCardinality = "one" | "many";

/**
 * Marker object returned by {@link Schema.hasOne} / {@link Schema.hasMany} and
 * consumed by `Of()`.  At runtime this is simply a tagged object carrying the
 * *target* schema class and the requested cardinality.  No methods are
 * attached – the descriptor is treated as an opaque payload by the rest of the
 * library.
 */
export interface RelationshipDescriptor<
  S extends { new (input: any): SchemaInstance },
  C extends RelationshipCardinality = RelationshipCardinality,
> {
  /** brand */
  readonly [RELATIONSHIP]: true;
  /** The child schema constructor to instantiate. */
  readonly schemaClass: S;
  /** Cardinality flag – "one" for single instance, "many" for arrays. */
  readonly cardinality: C;
}

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
