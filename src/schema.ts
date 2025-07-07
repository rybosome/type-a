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
type SchemaClass = {
  new (input: any): SchemaInstance;
  _schema: Fields;
};

// --------------------
// FieldType
// --------------------

/**
 * A field description used by Schema.
 */
export interface FieldType<T extends Typeable> {
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
   * Optional nested Schema class. When present this field is automatically
   * instantiated, validated and serialised recursively.
   */
  schemaClass?: SchemaClass;
}

/* ------------------------------------------------------------------ */
/* Of                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Helper aliases used by the `Of<T>` overloads below.
 *  • `FieldWithDefault`  – `default` is **required** (present)
 *  • `FieldWithoutDefault` – `default` is **optional** and restricted to
 *    `undefined`, making it *absent* for assignability checks.
 */
type FieldWithDefault<T extends Typeable> = FieldType<T> & {
  default: T | (() => T);
};

/**
 * Field descriptor *without* a default.
 *
 * By omitting the `default` key completely, the conditional type used in
 * `InputValueMap` (`F[K] extends { default: any }`) correctly recognises that
 * this field lacks a default and may therefore be required.
 */
type FieldWithoutDefault<T extends Typeable> = Omit<FieldType<T>, "default">;

/**
 * Create a field descriptor.
 *
 * Overload #1 – with default value
 * Overload #2 – without default value (opts provided)
 * Overload #3 – nested Schema class
 */
export function Of<T extends Typeable>(opts?: {
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];
}): FieldWithoutDefault<T>;
export function Of<T extends Typeable>(opts?: {
  default: T | (() => T);
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];
}): FieldWithDefault<T>;
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
    return base;
  };

  // ------------------------------------------------------------------
  // Case A – args[0] is a SchemaClass constructor (single instance)
  // ------------------------------------------------------------------
  if (
    args.length > 0 &&
    typeof args[0] === "function" &&
    "_schema" in args[0]
  ) {
    const schemaClass = args[0] as SchemaClass;
    const opts = (args[1] ?? undefined) as Parameters<typeof makeField>[1];

    return makeField(
      {
        schemaClass,
      },
      opts,
    );
  }

  // ------------------------------------------------------------------
  // Case B – args[0] is an **array** containing a single SchemaClass
  //          constructor (array of instances)
  // ------------------------------------------------------------------
  if (
    args.length > 0 &&
    Array.isArray(args[0]) &&
    args[0].length === 1 &&
    typeof args[0][0] === "function" &&
    "_schema" in args[0][0]
  ) {
    const schemaClass = args[0][0] as SchemaClass;
    const opts = (args[1] ?? undefined) as Parameters<typeof makeField>[1];

    // The generic `T` here becomes `OutputOf<typeof schemaClass>[]`
    return makeField(
      {
        schemaClass,
        // annotate value as array via generic parameter – nothing to set at runtime
      },
      opts,
    );
  }

  // ------------------------------------------------------------------
  // Case C – primitive / non-schema field definitions (legacy path)
  // ------------------------------------------------------------------

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
  // store backing fields
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
      // Determine supplied value; fall back to default when omitted/undefined
      const supplied = (input as Record<string, unknown>)[key as string];
      const def = fieldDef.default;
      const value =
        supplied !== undefined
          ? supplied
          : typeof def === "function"
            ? (def as () => unknown)()
            : def;

      // Handle nested Schema instantiation when necessary
      const nestedValue = (() => {
        const Ctor = fieldDef.schemaClass;
        if (!Ctor || value === undefined || value === null) return value;

        // Array-of-schema support
        if (Array.isArray(value)) {
          return value.map((v) => (v instanceof Ctor ? v : new Ctor(v as any)));
        }

        return value instanceof Ctor ? value : new Ctor(value as any);
      })();

      const field = {
        value: nestedValue as ValueMap<F>[typeof key],

        // Normalise `is` so `_fields` always stores a single function
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

        // Preserve the original default (value or callable) verbatim
        default: fieldDef.default as FieldType<
          ValueMap<F>[typeof key]
        >["default"],

        // Preserve nested SchemaClass sentinel so `validate()` and `toJSON()`
        // can recurse.  When absent we deliberately omit the key so the
        // resulting object remains minimal for primitive fields.
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
        if (Array.isArray(field.value)) {
          field.value.forEach((item: Schema<any>, idx: number) => {
            const nestedErrors = item.validate();
            for (const msg of nestedErrors)
              errors.push(`${key}[${idx}].${msg}`);
          });
        } else {
          const nestedErrors = (field.value as Schema<any>).validate();
          for (const msg of nestedErrors) errors.push(`${key}.${msg}`);
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
        if (!field.schemaClass || field.value == null) return field.value;

        if (Array.isArray(field.value)) {
          return field.value.map((v: Schema<any>) => v.toJSON());
        }
        return (field.value as Schema<any>).toJSON();
      })();
      // Recursively serialise (handles Map & nested objects)
      (json as Record<string, unknown>)[key] = serialise(raw);
    }
    return json;
  }
}
