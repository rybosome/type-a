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

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Run-time shape of a Schema class (produced by {@link Schema.from}).
 */
export type SchemaClass = {
  new (input: any): SchemaInstance;
  _schema: Fields;
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
   * Optional [serializer, deserializer] tuple allowing callers to customise
   * how a value is converted **to** and **from** its raw JSON-compatible
   * representation.
   *
   *   - *Serializer*:   `T → R`   (e.g. `Date → string`)
   *   - *Deserializer*: `R → T`   (e.g. `string → Date`)
   */
  serdes?: [(value: T) => R, (value: R) => T];

  /**
   * Optional nested Schema class. When present this field is automatically
   * instantiated, validated and serialised recursively.
   */
  schemaClass?: SchemaClass;
}

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

// 3. Primitive field with custom serdes **without default**
export function Of<T extends Typeable, R = unknown>(opts: {
  serdes: [(value: T) => R, (value: R) => T];
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];
}): FieldWithoutDefault<T, R> & {
  serdes: [(value: T) => R, (value: R) => T];
};

// 4. Primitive field with custom serdes **with default**
export function Of<T extends Typeable, R = unknown>(opts: {
  serdes: [(value: T) => R, (value: R) => T];
  default: T | (() => T);
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];
}): FieldWithDefault<T, R> & {
  serdes: [(value: T) => R, (value: R) => T];
};

// 5. Generic implementation – internal body (not exposed)
// NOTE: Default `R` to `T` so that calls without custom `serdes` inherit the
//       same raw type as the value itself, matching the public overloads.
export function Of<T extends Typeable, R = T>(opts?: {
  default?: T | (() => T);
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];
  serdes?: [(value: T) => R, (value: R) => T];
}): FieldType<T, R> {
  // Handle overload where opts is a schema class
  if (typeof opts === "function" && "_schema" in opts) {
    return {
      __t: undefined,
      value: undefined,
      schemaClass: opts,
    } as unknown as FieldType<any>;
  }

  let schemaClass: SchemaClass | undefined = undefined;

  // Auto-extract schemaClass from opts.__t
  if (opts && typeof opts === "object" && "__t" in opts) {
    const t = (opts as any).__t;

    const maybeInstance = Array.isArray(t) ? t[0] : t;

    if (maybeInstance && typeof maybeInstance === "object") {
      if (maybeInstance.constructor?._schema) {
        schemaClass = maybeInstance.constructor;
      }
    }
  }

  const base = {
    value: undefined as T | undefined,
    ...(opts?.is ? { is: opts.is } : {}),
    ...(opts?.serdes ? { serdes: opts.serdes } : {}),
    ...(schemaClass ? { schemaClass } : {}),
  };

  if (opts && "default" in opts && opts.default !== undefined) {
    return { ...base, default: opts.default } as FieldType<T, R>;
  }

  return base as FieldType<T, R>;
}

// --------------------
// Schema and Model Types
// --------------------

type Fields = Record<string, FieldType<any>>;

type ValueType<F> = F extends { schemaClass: infer S }
  ? S extends SchemaClass
    ? OutputOf<S>
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
    ? Nested<S>
    : never
  : F extends {
        serdes: [(value: any) => infer Raw, (value: infer Raw) => any];
      }
    ? Raw
    : F extends FieldType<infer V, any>
      ? V extends { __isNested: true; schemaClass: infer S }
        ? S extends SchemaClass
          ? InputOf<S>
          : never
        : V
      : never;

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
      const value =
        supplied !== undefined
          ? supplied
          : typeof def === "function"
            ? (def as () => unknown)()
            : def;

      const deserialised = (() => {
        if (!fieldDef.serdes) return value;
        if (supplied === undefined) return value;
        if (value === undefined || value === null) return value;
        return (
          fieldDef.serdes as [(v: unknown) => unknown, (v: unknown) => unknown]
        )[1](value as any);
      })();

      const nestedValue =
        fieldDef.schemaClass != null
          ? instantiateNestedSchemas(deserialised, fieldDef.schemaClass)
          : deserialised;

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
          return rawIs;
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

  static from<F extends Record<string, FieldType<any>>>(schema: F) {
    class ModelWithSchema extends Schema<F> {
      static _schema = schema;
    }

    return ModelWithSchema as {
      new (input: InputValueMap<F>): Schema<F> & ValueMap<F>;
      _schema: F;
      /**
       * Build a validated instance. Returns a `Result` where `val` is the
       * successfully-constructed model (when validation passes) and `errs`
       * is a populated `ErrLog` (when validation fails).
       */
      tryNew(
        input: ValueMap<F>,
      ): Result<Schema<F> & ValueMap<F>, ErrLog<ValueMap<F>>>;
    };
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
      if (field.schemaClass && field.value != null) {
        const nestedErrors = (field.value as Schema<any>).validate();
        for (const msg of nestedErrors) errors.push(`${key}.${msg}`);
      }

      // Cast `is` so we have a stable, callable signature
      const is = field.is as ((val: unknown) => true | string) | undefined;

      if (is && field.value !== undefined && field.value !== null) {
        const result = is(field.value as NonNullable<typeof field.value>);
        if (result !== true) errors.push(`${key}: ${result}`);
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
      let raw: unknown;
      if (field.schemaClass && field.value != null) {
        raw = (field.value as Schema<any>).toJSON();
      } else if (field.serdes && field.value != null) {
        raw = field.serdes[0](field.value as any);
      } else {
        raw = field.value;
      }

      // Recursively serialise (handles Map & nested objects)
      (json as Record<string, unknown>)[key] = serialise(raw);
    }
    return json;
  }
}
