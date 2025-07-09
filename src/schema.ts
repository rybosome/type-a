/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ErrLog,
  InputOf,
  LogicalConstraint,
  OutputOf,
  Result,
  Typeable,
  SchemaInstance,
} from "@src/types";

import { RelationshipDescriptor } from "@src/types";

import type { Registry } from "@src/registry";
import { defaultRegistry } from "@src/registry";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Run-time shape of a Schema class (produced by {@link Schema.from}).
 */
export type SchemaClass = {
  new (input: any): SchemaInstance;
  _schema: Fields;
  // Registry captured at declaration time (internal)
  //__registry?: Registry;
};

export type Nested<S extends SchemaClass> = InputOf<S> | InstanceType<S>;

/**
 * Recursively instantiate nested schema values.
 */
export function instantiateNestedSchemas<T>(
  value: unknown,
  schemaClass: { new (v: any): T },
): T | T[] {
  console.error("instantiateNestedSchemas called with:", value);

  if (Array.isArray(value)) {
    const result = value.map((v) => {
      const instance = v instanceof schemaClass ? v : new schemaClass(v);
      console.error(" → instantiating array item:", v, "→", instance);
      return instance;
    });
    return result;
  }

  if (value instanceof schemaClass) {
    console.error(" → already instance of schemaClass:", value);
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const instance = new schemaClass(value);
    console.error(" → instantiated object:", value, "→", instance);
    return instance;
  }

  console.error(" → returned unchanged:", value);
  return value as T;
}

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
   * value during `Schema` construction and when calling `toJSON()`.  The first
   * element is the **deserialiser** (raw -> in-memory), the second is the
   * **serialiser** (in-memory -> raw).
   */
  serdes?: [(raw: R) => T, (val: T) => R];

  /**
   * Relationship descriptor produced by {@link Schema.hasOne} /
   * {@link Schema.hasMany}.  Included primarily for registry bookkeeping – the
   * core runtime logic uses {@link schemaClass} and the field's generic type
   * (array vs scalar) for instantiation.
   */
  relation?: RelationshipDescriptor<any>;
}

/* ------------------------------------------------------------------ */
/* Default primitive validators                                        */
/* ------------------------------------------------------------------ */

/**
 * Built-in primitive validators automatically applied to any field that has
 * **no** nested `schemaClass` / `variantClasses` **and** no user-supplied
 * `is` predicate.  The table keys are raw JavaScript `typeof` strings or
 * special sentinels for complex objects (`array`, `date`, `object`).
 */
const DEFAULT_VALIDATORS: Record<string, LogicalConstraint<any>> = {
  boolean: (v: unknown) => typeof v === "boolean" || "expected boolean", // primitive boolean
  number: (v: unknown) =>
    (typeof v === "number" && Number.isFinite(v)) || "expected finite number",
  string: (v: unknown) => typeof v === "string" || "expected string",
  // bigint & date left out for now – user may supply custom validators
  array: (v: unknown) => Array.isArray(v) || "expected array",
  object: (v: unknown) =>
    (v !== null && typeof v === "object" && !Array.isArray(v)) ||
    "expected plain object",
};

/* ------------------------------------------------------------------ */
/* Of                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Helper aliases used by the `Of<T>` overloads below.  They enforce whether
 * the caller supplied a `default` as well as whether a `[serializer,
 * deserializer]` tuple is present.
 */
type FieldWithDefault<T extends Typeable, R = T> = FieldType<T, R> & {
  default: T | (() => T);
};

/**
 * Field descriptor *without* a default.
 */
type FieldWithoutDefault<T extends Typeable, R = T> = Omit<
  FieldType<T, R>,
  "default"
>;

/**
 * Create a field descriptor.
 */

// ──────────────────────────────────────────────────────────────────────────
// Overload signatures
// ──────────────────────────────────────────────────────────────────────────

// 1. Primitive field **without** default/serdes
export function Of<T extends Typeable>(opts?: {
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];
}): FieldWithoutDefault<T>;

// 2. Primitive field **with default** (no serdes)
export function Of<T extends Typeable>(opts: {
  default: T | (() => T);
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];
}): FieldWithDefault<T>;

// 3. Primitive field **with custom serdes** (optional default)
export function Of<T extends Typeable, R = T>(opts: {
  serdes: [(val: T) => R, (raw: R) => T] | [(raw: R) => T, (val: T) => R];
  default?: T | (() => T);
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];
}): FieldType<T, R> & { serdes: [(val: T) => R, (raw: R) => T] };

// (duplicate discriminated-union overload removed; see earlier definition)
// Nested Schema without options (single instance)
export function Of<S extends SchemaClass>(
  schemaClass: S,
): FieldWithoutDefault<OutputOf<S>> & { schemaClass: S };

// Nested Schema with options (single instance)
export function Of<S extends SchemaClass>(
  schemaClass: S,
  opts?: {
    default?: OutputOf<S> | (() => OutputOf<S>);
    is?:
      | LogicalConstraint<NonNullable<OutputOf<S>>>
      | LogicalConstraint<NonNullable<OutputOf<S>>>[];
  },
): FieldType<OutputOf<S>> & { schemaClass: S };

// Nested Schema **array** with options
export function Of<S extends SchemaClass>(
  schemaClass: S[],
  opts?: {
    default?: OutputOf<S>[] | (() => OutputOf<S>[]);
    is?:
      | LogicalConstraint<NonNullable<OutputOf<S>>>
      | LogicalConstraint<NonNullable<OutputOf<S>>>[];
  },
): FieldType<OutputOf<S>[]> & { schemaClass: S };

// Relationship descriptor – hasOne (single)
export function Of<S extends SchemaClass>(
  rel: RelationshipDescriptor<S, "one">,
  opts?: {
    default?: OutputOf<S> | (() => OutputOf<S>);
    is?:
      | LogicalConstraint<NonNullable<OutputOf<S>>>
      | LogicalConstraint<NonNullable<OutputOf<S>>>[];
  },
): FieldType<OutputOf<S>> & {
  schemaClass: S;
  relation: RelationshipDescriptor<S, "one">;
};

// Relationship descriptor – hasMany (array)
export function Of<S extends SchemaClass>(
  rel: RelationshipDescriptor<S, "many">,
  opts?: {
    default?: OutputOf<S>[] | (() => OutputOf<S>[]);
    is?:
      | LogicalConstraint<NonNullable<OutputOf<S>>>
      | LogicalConstraint<NonNullable<OutputOf<S>>>[];
  },
): FieldType<OutputOf<S>[]> & {
  schemaClass: S;
  relation: RelationshipDescriptor<S, "many">;
};

export function Of(...args: any[]): any {
  /* -------------------------------------------------------------- */
  /* Detect argument pattern                                        */
  /* -------------------------------------------------------------- */

  // Helpers -------------------------------------------------------
  const makeField = <T extends Typeable>(
    extra: Partial<FieldType<T>>,
    opts:
      | {
          default?: T | (() => T);
          is?:
            | LogicalConstraint<NonNullable<T>>
            | LogicalConstraint<NonNullable<T>>[];
        }
      | undefined,
  ): FieldType<T> => {
    const base: FieldType<T> = {
      // phantom compile-time marker
      __t: undefined as unknown as T,
      value: undefined as unknown as T,
      ...extra,
    } as FieldType<T>;

    if (opts?.is) (base as any).is = opts.is;
    if (opts && "default" in opts && opts.default !== undefined) {
      (base as any).default = opts.default;
    }
    if (opts && "serdes" in opts && (opts as any).serdes !== undefined) {
      (base as any).serdes = (opts as any).serdes;
    }
    return base;
  };

  // Variant union support: opts object with `variantClasses` key.
  if (
    args.length === 1 &&
    args[0] &&
    typeof args[0] === "object" &&
    !Array.isArray(args[0]) &&
    Array.isArray((args[0] as any).variantClasses)
  ) {
    const optsObj = args[0] as {
      variantClasses: SchemaClass[];
      default?: Typeable | (() => Typeable);
      is?: LogicalConstraint<Typeable> | LogicalConstraint<Typeable>[];
    };

    const { variantClasses, ...rest } = optsObj;

    // Validate variantClasses shape at runtime for helpful errors.
    if (
      variantClasses.length === 0 ||
      !variantClasses.every((c) => typeof c === "function" && "_schema" in c)
    ) {
      throw new Error(
        "Of(): `variantClasses` must be an array of Schema classes with static _schema",
      );
    }

    return makeField(
      {
        variantClasses,
      },
      rest as Parameters<typeof makeField>[1],
    );
  }

  const opts = (args[0] ?? undefined) as {
    default?: Typeable | (() => Typeable);
    is?: ((val: any) => boolean | string) | ((val: any) => boolean | string)[];
  };

  const base: FieldType<any> = {
    __t: undefined,
    value: undefined,
  } as FieldType<any>;

  if (opts?.is) (base as any).is = opts.is;
  if (opts && "default" in opts && opts.default !== undefined) {
    (base as any).default = opts.default;
  }
  if (opts && "serdes" in opts && (opts as any).serdes !== undefined) {
    (base as any).serdes = (opts as any).serdes;
  }

  return base;
}

// --------------------
// Schema and Model Types
// --------------------

type Fields = Record<string, FieldType<any>>;

type ValueType<F> = F extends { schemaClass: infer S }
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

type ValueMap<F extends Fields> = { [K in keyof F]: ValueType<F[K]> };

/**
 * Keys that are optional in the constructor's input object.
 *
 * A key is optional when the field descriptor provides a `default`, or the declared
 * value type already allows `undefined`.
 */
type OptionalKeys<F extends Fields> = {
  [K in keyof F]: F[K] extends { default: any }
    ? K
    : undefined extends ValueMap<F>[K]
      ? K
      : never;
}[keyof F];

/**
 * Keys that must be provided in the constructor's input object.
 */
type RequiredKeys<F extends Fields> = {
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
type InputType<F> = F extends { schemaClass: infer S }
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
    : ValueType<F>;

type InputValueMap<F extends Fields> = {
  [K in RequiredKeys<F>]: InputType<F[K]>;
} & {
  [K in OptionalKeys<F>]?: InputType<F[K]>;
};

// --------------------
// Schema
// --------------------

/**
 * Combine several constraints into one.  Runs each in sequence and returns the
 * first non-`true` result (an error string) or `true` when all pass.
 */
function composeConstraints<T extends Typeable>(
  constraints: LogicalConstraint<T>[],
): LogicalConstraint<T> {
  return (val: T) => {
    for (const c of constraints) {
      const res = c(val);
      if (res !== true) return res;
    }
    return true;
  };
}

/**
 * A dataclass-style object with parsing, validation and rendering.
 */
export class Schema<F extends Fields> implements SchemaInstance {
  readonly __isSchemaInstance = true as const;
  private readonly _fields: {
    [K in keyof F]: FieldType<ValueMap<F>[K]>;
  };

  constructor(input: InputValueMap<F>) {
    const schema = (this.constructor as unknown as { _schema: F })._schema;

    const fields = {} as {
      [K in keyof F]: FieldType<ValueMap<F>[K]>;
    };

    for (const [key, fieldDef] of Object.entries(schema) as [
      keyof F,
      F[keyof F],
    ][]) {
      if (!fieldDef.schemaClass && "__t" in fieldDef) {
        const rawT = (fieldDef as any).__t;
        const maybeInstance = Array.isArray(rawT) ? rawT[0] : rawT;

        if (
          maybeInstance &&
          typeof maybeInstance === "object" &&
          maybeInstance.constructor?._schema
        ) {
          (fieldDef as any).schemaClass = maybeInstance.constructor;
          console.error(
            `✅ schemaClass inferred for field '${String(key)}':`,
            maybeInstance.constructor.name,
          );
        }
      }
      const supplied = (input as Record<string, unknown>)[key as string];
      const def = fieldDef.default;
      const rawValue =
        supplied !== undefined
          ? supplied
          : typeof def === "function"
            ? (def as () => unknown)()
            : def;

      /* ----------------------------------------------- */
      /* Apply custom deserialiser (raw -> in-memory)    */
      /* ----------------------------------------------- */

      const deserialised = (() => {
        if (!fieldDef.serdes) return rawValue;
        const [, deserialize] = fieldDef.serdes as [
          (val: any) => unknown,
          (raw: unknown) => unknown,
        ];
        // Only transform when value is non-nullish – keep null/undefined as-is.
        if (rawValue === null || rawValue === undefined) return rawValue;
        return deserialize(rawValue as any);
      })();

      // Handle nested Schema instantiation when necessary
      const nestedValue = (() => {
        const singleCtor = fieldDef.schemaClass;
        const ctorSet = fieldDef.variantClasses;

        if (
          (!singleCtor && !ctorSet) ||
          deserialised === undefined ||
          deserialised === null
        ) {
          return deserialised;
        }

        // Helper to pick constructor for discriminated unions ----------------
        const pickCtor = (raw: unknown): SchemaClass | undefined => {
          if (singleCtor) return singleCtor;
          if (!ctorSet) return undefined;

          // Simple heuristic: use `kind` discriminator when present.
          const discriminator = (raw as any)?.kind;
          if (discriminator != null) {
            const match = ctorSet.find((C) => {
              try {
                // Attempt cheap prototype check first – avoids full instantiation.
                const schema = (C as any)._schema as Fields;
                if (
                  schema &&
                  Object.prototype.hasOwnProperty.call(schema, "kind") &&
                  // access default or literal value if present
                  (schema.kind as any).default === discriminator
                )
                  return true;
              } catch {
                /* noop */
              }
              return false;
            });
            if (match) return match;
          }

          // Fallback heuristic ------------------------------------------------
          // Choose the constructor whose declared schema keys overlap the most
          // with the raw object's keys.  This is a simple, deterministic
          // approach that works well for typical discriminated unions where
          // each subtype has unique fields.
          if (raw && typeof raw === "object") {
            const rawKeys = new Set(
              Object.keys(raw as Record<string, unknown>),
            );
            let best: SchemaClass | undefined;
            let bestScore = -1;

            for (const C of ctorSet) {
              const keys = Object.keys((C as any)._schema as Fields);
              let score = 0;
              for (const k of keys) if (rawKeys.has(k)) score += 1;
              if (score > bestScore) {
                bestScore = score;
                best = C;
              }
            }
            if (best) return best;
          }

          // As a final fallback, just use the first constructor.
          return ctorSet[0];
        };

        const convert = (val: unknown): unknown => {
          const Ctor = pickCtor(val);
          if (!Ctor) return val; // give up – leave raw
          return val instanceof Ctor ? val : new Ctor(val as any);
        };

        // Array-of-schema support
        if (Array.isArray(deserialised)) {
          return (deserialised as unknown[]).map(convert);
        }
        return convert(deserialised);
      })();

      // nestedValue already computed above; re-use here

      if (fieldDef.schemaClass) {
        console.error(`[${String(key)}] nestedValue:`, nestedValue);
        console.error(
          `[${String(key)}] is instance of schemaClass?`,
          nestedValue instanceof fieldDef.schemaClass,
        );
      }

      const field = {
        value: nestedValue as ValueMap<F>[typeof key],
        is: (() => {
          const rawIs = fieldDef.is as
            | LogicalConstraint<NonNullable<ValueMap<F>[typeof key]>>
            | LogicalConstraint<NonNullable<ValueMap<F>[typeof key]>>[]
            | undefined;
          if (Array.isArray(rawIs)) {
            return rawIs.length > 0 ? composeConstraints(rawIs) : undefined;
          }
          if (rawIs) return rawIs;

          /* ---------------------------------------------------- */
          /* Fallback to built-in primitive validators            */
          /* ---------------------------------------------------- */

          if (!fieldDef.schemaClass && !fieldDef.variantClasses) {
            const pick = (val: unknown): LogicalConstraint<any> | undefined => {
              const t = typeof val;
              if (t === "object") {
                // date validator not yet built-in
                if (Array.isArray(val)) return DEFAULT_VALIDATORS.array;
                return DEFAULT_VALIDATORS.object;
              }
              return (
                DEFAULT_VALIDATORS as Record<string, LogicalConstraint<any>>
              )[t];
            };

            // Determine based on *runtime value* (after deserialisation) or default sentinel "undefined".
            const validator = pick(deserialised);
            return validator;
          }

          return undefined;
        })(),
        default: fieldDef.default as FieldType<
          ValueMap<F>[typeof key]
        >["default"],
        ...(fieldDef.serdes ? { serdes: fieldDef.serdes } : {}),
        ...(fieldDef.schemaClass ? { schemaClass: fieldDef.schemaClass } : {}),
      } as FieldType<ValueMap<F>[typeof key]>;

      fields[key] = field;

      Object.defineProperty(this, key, {
        get: () => field.value,
        set: (val: ValueMap<F>[typeof key]) => {
          field.value = val;
        },
        enumerable: true,
      });
    }

    this._fields = fields;
  }

  static from<F extends Record<string, FieldType<any>>>(
    schema: F,
    opts?: { registry?: Registry },
  ) {
    const registry = opts?.registry ?? defaultRegistry;

    class ModelWithSchema extends Schema<F> {
      static _schema = schema;
      static __registry = registry;
    }

    /* -------------------------------------------------------- */
    /* Populate registry with parent-driven relationships       */
    /* -------------------------------------------------------- */

    for (const [fieldName, fieldDef] of Object.entries(schema)) {
      const rel = (fieldDef as FieldType<any>).relation as
        | RelationshipDescriptor<SchemaClass>
        | undefined;
      if (!rel) continue;

      let map = registry.get(ModelWithSchema as unknown as SchemaClass);
      if (!map) {
        map = new Map();
        registry.set(ModelWithSchema as unknown as SchemaClass, map);
      }

      if (rel.cardinality === "many") {
        map.set(fieldName, [rel.schemaClass]);
      } else {
        map.set(fieldName, rel.schemaClass);
      }
    }

    type StaticHelpers = {
      /** See {@link Schema.tryNew} */
      tryNew(
        input: ValueMap<F>,
      ): Result<Schema<F> & ValueMap<F>, ErrLog<ValueMap<F>>>;
    } & Pick<typeof Schema, "nestedArray" | "nestedVariant">;

    return ModelWithSchema as {
      new (input: InputValueMap<F>): Schema<F> & ValueMap<F>;
      _schema: F;
    } & StaticHelpers;
  }

  /**
   * Static constructor with built-in validation and aggregated error
   * reporting.
   */
  static tryNew<I extends Fields>(
    this: {
      new (input: I): Schema<any> & I;
      _schema: Fields;
    },
    input: I,
  ): Result<InstanceType<typeof this>, ErrLog<I>> {
    const instance = new this(input);
    const validationErrors = instance.validate();

    if (validationErrors.length === 0) {
      // success path
      return { val: instance, errs: undefined };
    }

    // failure path – build ErrLog with undefined for each field first
    const errLog = Object.keys(this._schema).reduce((acc, key) => {
      (acc as Record<string, string | undefined>)[key] = undefined;
      return acc;
    }, {} as ErrLog<I>);

    // populate messages parsed from "<key>: <message>" strings
    for (const raw of validationErrors) {
      const idx = raw.indexOf(": ");
      if (idx !== -1) {
        const key = raw.slice(0, idx);
        const msg = raw.slice(idx + 2);
        (errLog as Record<string, string | undefined>)[key] = msg;
      }
    }

    errLog.summarize = () => validationErrors.slice();

    return { val: undefined, errs: errLog };
  }

  validate(): string[] {
    const schema = (this.constructor as unknown as { _schema: F })._schema;
    const errors: string[] = [];

    for (const key in schema) {
      const field = this._fields[key as keyof F];

      /* ---------------------------------------------------------- */
      /* Recurse into nested Schemas                                */
      /* ---------------------------------------------------------- */
      if (field.value != null) {
        const pushNestedErrors = (item: Schema<any>, prefix: string) => {
          const nestedErrors = item.validate();
          for (const msg of nestedErrors) errors.push(`${prefix}.${msg}`);
        };

        if (Array.isArray(field.value)) {
          field.value.forEach((item: unknown, idx: number) => {
            if ((item as any)?.__isSchemaInstance) {
              pushNestedErrors(item as Schema<any>, `${key}[${idx}]`);
            }
          });
        } else if ((field.value as any)?.__isSchemaInstance) {
          pushNestedErrors(field.value as Schema<any>, String(key));
        }
      }

      // Cast `is` so we have a stable, callable signature
      const is = field.is as ((val: unknown) => true | string) | undefined;

      if (is && field.value !== undefined && field.value !== null) {
        // Apply validator differently for array vs single value
        if (Array.isArray(field.value)) {
          field.value.forEach((item: unknown, idx: number) => {
            const res = is(item);
            if (res !== true) errors.push(`${key}[${idx}]: ${res}`);
          });
        } else {
          const result = is(field.value as NonNullable<typeof field.value>);
          if (result !== true) errors.push(`${key}: ${result}`);
        }
      }
    }

    return errors;
  }

  toJSON(): ValueMap<F> {
    /**
     * Recursively serialise a runtime value so that the result is fully
     * JSON-compatible (plain objects, arrays and primitives only).  Schema
     * instances invoke their own `toJSON()` method; `Map` instances are
     * converted to plain objects via `Object.fromEntries()` while their values
     * are serialised recursively.
     */
    const serialise = (val: unknown): unknown => {
      if (val == null) return val;

      /* -------------------------------------------------- */
      /* Primitive BigInt handling                          */
      /* -------------------------------------------------- */
      // Native `JSON.stringify` throws on BigInt values.  Convert to a
      // string representation so callers can safely serialise the output
      // produced by `Schema#toJSON()` without additional hooks.
      if (typeof val === "bigint") return val.toString();

      if (Array.isArray(val)) return val.map(serialise);
      if (val instanceof Map) {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of val.entries()) {
          // Convert key to string for use as an object property
          const key = String(k);
          // Guard against collisions such as 1 vs "1" or true vs "true"
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            throw new Error(
              `Duplicate key after stringification: ${String(k)}`,
            );
          }
          obj[key] = serialise(v);
        }
        return obj;
      }

      if (typeof val === "object") {
        // Preserve run-time identity for `Schema` instances – they manage their own serialisation.
        if ((val as any).__isSchemaInstance) {
          return (val as Schema<any>).toJSON();
        }

        /* ------------------------------------------------------ */
        /* Plain-object (Record) detection                         */
        /* ------------------------------------------------------ */
        const proto = Object.getPrototypeOf(val);
        if (proto === Object.prototype || proto === null) {
          const obj: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            obj[k] = serialise(v);
          }
          return obj;
        }

        // Exotic objects (Date, RegExp, custom classes, etc.) – return as-is so callers can decide.
        return val;
      }
      return val; // primitive scalar
    };

    const json = {} as ValueMap<F>;
    for (const key in this._fields) {
      const field = this._fields[key];
      const raw = (() => {
        if (field.value == null) return field.value;

        if (Array.isArray(field.value)) {
          return field.value.map((v: unknown) =>
            (v as any)?.__isSchemaInstance ? (v as Schema<any>).toJSON() : v,
          );
        }

        return (field.value as any)?.__isSchemaInstance
          ? (field.value as Schema<any>).toJSON()
          : field.value;
      })();
      // Apply custom serialiser when supplied (in-memory -> raw)
      const rendered = (() => {
        if (!field.serdes) return raw;
        const [serialize] = field.serdes as [
          (val: unknown) => unknown,
          (raw: unknown) => unknown,
        ];
        if (raw == null) return raw;
        if (Array.isArray(raw)) return raw.map(serialize);
        return serialize(raw);
      })();

      // Recursively serialise (handles Map & nested objects)
      (json as Record<string, unknown>)[key] = serialise(rendered);
    }
    return json;
  }

  /* ---------------------------------------------------------- */
  /* Registry helpers                                           */
  /* ---------------------------------------------------------- */

  /**
   * Register the calling Schema class as the element type of an **array**
   * field on a parent Schema.  Currently this helper is an identity function
   * that returns the constructor so it can be used inline as a value argument
   * to {@link Of}.  A future release may attach richer runtime metadata.
   */
  static nestedArray<Parent extends SchemaClass>(
    this: SchemaClass,

    _parentFn: () => Parent,
    _opts?: { registry?: Registry },
  ): typeof this {
    void _parentFn;
    void _opts;
    return this;
  }

  /**
   * Register the calling Schema class as a **variant** constructor on a parent
   * Schema.  Identity function for now – behaviour mirrors {@link nestedArray}.
   */
  static nestedVariant<Parent extends SchemaClass>(
    this: SchemaClass,
    _parentFn: () => Parent,
    _opts?: { registry?: Registry },
  ): typeof this {
    void _parentFn;
    void _opts;
    return this;
  }
}
