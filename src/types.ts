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
export type ScalarTypeable =
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
export type TupleTypeable =
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
/* Serialization / Deserialization                                    */
/* ------------------------------------------------------------------ */

/**
 * Compile-time alias representing a pair of pure functions that convert
 * between an *in-memory* value (`T`) and its *raw* serialised form (`R`).
 *
 * The tuple order is **[serialize, deserialize]**:
 *
 * ```ts
 * const isoSerdes: Serdes<Date, string> = [
 *   date => date.toISOString(), // Date → string
 *   iso  => new Date(iso),      // string → Date
 * ];
 * ```
 */
export type Serdes<T extends Typeable, R = T> = [
  /** serializer – in-memory → raw */
  (val: T) => R,
  /** deserializer – raw → in-memory */
  (raw: R) => T,
];

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
 * Internally this is merely an alias over `OutputOf<…>` – no additional runtime
 * behaviour is attached.  Validation, serialisation, and re-hydration are
 * handled by the {@link Schema} logic once the corresponding `schemaClasses`
 * array is supplied to `Of()`.
 */

export type Variant<
  Classes extends readonly { new (input: any): SchemaInstance }[],
> = OutputOf<Classes[number]>;

/**
 * Helper aliases used by the `Of<T>` overloads below.  They enforce whether
 * the caller supplied a `default` as well as whether a `[serializer,
 * deserializer]` tuple is present.
 */
export type FieldWithDefault<T extends Typeable, R = T> = FieldType<T, R> & {
  default: T | (() => T);
};

/**
 * Field descriptor *without* a default.
 */
export type FieldWithoutDefault<T extends Typeable, R = T> = Omit<
  FieldType<T, R>,
  "default"
>;

// --------------------
// FieldType
// --------------------

/**
 * A field description used by Schema.
 */
/**
 * Describes a Schema property at both compile-time (for type inference/validation)
 * and runtime (for parsing/validation/serialization).
 *
 * @typeParam T   The *in-memory* typed representation used by callers once the
 *                value has been parsed/deserialised.
 * @typeParam R   The *raw* external representation accepted by the constructor
 *                **and** produced by the optional `serializer`.  When no
 *                custom serialisation is supplied `R` defaults to `T` so
 *                existing call-sites continue to compile unchanged.
 */
export interface FieldType<T extends Typeable, R = T> {
  /**
   * Compile-time marker that preserves the **exact** generic parameter `T`
   * (including `undefined`) during conditional-type inference via `FieldType<infer V>`.
   *
   * This is a phantom property: it exists only at the type level and is never
   * assigned or accessed at runtime.
   *
   * Although **required** in the type, every real object is produced via a
   * type-assertion (`as FieldType<T>`) so no property is emitted.
   */
  readonly __t: T;

  /**
   * The underlying value contained in the field.  In addition to primitive
   * scalars and flat arrays, **tuple** values (both fixed-length and variadic
   * rest-pattern forms) are fully supported via the extended {@link Typeable}
   * definition.
   */
  value: T | undefined;

  /**
   * Optional default value applied when the caller omits the field or passes
   * `undefined`. The default may be the value itself **or** a zero-arg function
   * returning the value (useful for non-primitive or non-constant defaults).
   */
  default?: T | (() => T);

  /**
   * Optional validator(s). When an array is provided, every constraint is run
   * in order until the first failure (the returned string) or until all pass
   * (returns `true`).
   */
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];

  /**
   * Optional nested Schema class (singular). When present this field is
   * automatically instantiated, validated and serialised recursively.
   */
  schemaClass?: SchemaClass;

  /**
   * Optional *set* of Schema classes used for explicit variant unions. When
   * provided the runtime picks the correct constructor from this list based on
   * the incoming raw object's discriminator value (see {@link variantKey}) and
   * instantiates it.  Mutually exclusive with {@link FieldType.schemaClass}.
   */
  variantClasses?: SchemaClass[];

  /**
   * Optional custom serialisation/deserialisation tuple applied to the raw
   * value during construction and when calling `toJSON()`.  The tuple obeys
   * the {@link Serdes} contract:  `[serialize, deserialize]`.
   */
  serdes?: Serdes<T, R>;

  /**
   * Relationship descriptor produced by {@link Schema.hasOne} /
   * {@link Schema.hasMany}.  Included primarily for registry bookkeeping – the
   * core runtime logic uses {@link schemaClass} and the field's generic type
   * (array vs scalar) for instantiation.
   */
  relation?: RelationshipDescriptor<any>;
}

/**
 * Run-time shape of a Schema class (produced by {@link Schema.from}).
 */
export type SchemaClass = {
  new (input: any): SchemaInstance;
  _schema: Fields;
};

export type Nested<S extends SchemaClass> = InputOf<S> | InstanceType<S>;

export type Fields = Record<string, FieldType<any>>;

export type ValueType<F> = F extends { schemaClass: infer S }
  ? S extends SchemaClass
    ? F extends FieldType<infer V>
      ? V // Preserve generic param (handles arrays automatically)
      : OutputOf<S>
    : never
  : F extends { variantClasses: infer Arr }
    ? Arr extends SchemaClass[]
      ? F extends FieldType<infer V>
        ? V extends any[]
          ? OutputOf<Arr[number]>[]
          : OutputOf<Arr[number]>
        : OutputOf<Arr[number]>
      : never
    : F extends FieldType<infer V>
      ? V
      : never;

export type ValueMap<F extends Fields> = { [K in keyof F]: ValueType<F[K]> };

/**
 * Keys that are optional in the constructor's input object.
 *
 * A key is optional when the field descriptor provides a `default`, or the declared
 * value type already allows `undefined`.
 */
export type OptionalKeys<F extends Fields> = {
  [K in keyof F]: F[K] extends { default: any }
    ? K
    : undefined extends ValueMap<F>[K]
      ? K
      : never;
}[keyof F];

/**
 * Keys that must be provided in the constructor's input object.
 */
export type RequiredKeys<F extends Fields> = {
  [K in keyof F]: F[K] extends { default: any }
    ? never
    : undefined extends ValueMap<F>[K]
      ? never
      : K;
}[keyof F];

/**
 * Constructor input map:
 *  • Keys in `RequiredKeys` are mandatory.
 *  • Keys in `OptionalKeys` may be omitted.
 */
export type InputType<F> = F extends { schemaClass: infer S }
  ? S extends SchemaClass
    ? F extends FieldType<infer V>
      ? V extends any[]
        ? InputOf<S>[]
        : InputOf<S>
      : never
    : never
  : F extends { variantClasses: infer Arr }
    ? Arr extends SchemaClass[]
      ? F extends FieldType<infer V>
        ? V extends any[]
          ? InputOf<Arr[number]>[]
          : InputOf<Arr[number]>
        : InputOf<Arr[number]>
      : never
    : F extends FieldType<infer V2, infer R>
      ? V2 extends never
        ? never
        : R
      : ValueType<F>;

export type InputValueMap<F extends Fields> = {
  [K in RequiredKeys<F>]: InputType<F[K]>;
} & {
  [K in OptionalKeys<F>]?: InputType<F[K]>;
};
