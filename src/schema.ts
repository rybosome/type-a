/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ErrLog, Result } from "./types/result";

// --------------------
// Primitive & Constraints
// --------------------

export type Typeable = string | number | boolean | null | undefined;

export type LogicalConstraint<T extends Typeable> = (val: T) => true | string;

/**
 * A field description used by Schema.
 *
 * - `value`   – runtime value
 * - `default` – optional default applied when the caller omits the field
 * - `is`      – optional validation constraint
 */
export interface FieldType<T extends Typeable> {
  /**
   * Compile-time marker that preserves the **exact** generic parameter `T`
   * (including `undefined`) during conditional-type inference via
   * `FieldType<infer V>`.
   *
   * The property is added with the value `undefined` by the `Of()` helper and
   * is never used at runtime.
   */
  readonly __t: T;

  value: T | undefined;
  /**
   * Optional default value applied when the caller omits the field or passes
   * `undefined`. The default may be the value itself **or** a zero-arg function
   * returning the value (useful for non-primitive or non-constant defaults).
   */
  default?: T | (() => T);
  /**
   * Validation constraint that will only be invoked when a non-nullish value is
   * present (i.e. value is neither `null` nor `undefined`).
   */
  is?: LogicalConstraint<NonNullable<T>>;
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
 * Overload #2 – without default value
 */
export function Of<T extends Typeable>(opts: {
  default: T | (() => T);
  is?: LogicalConstraint<NonNullable<T>>;
}): FieldWithDefault<T>;
export function Of<T extends Typeable>(opts: {
  is?: LogicalConstraint<NonNullable<T>>;
}): FieldWithoutDefault<T>;
export function Of<T extends Typeable>(opts: {
  default?: T | (() => T);
  is?: LogicalConstraint<NonNullable<T>>;
}): FieldType<T> {
  const base = {
    __t: undefined as unknown as T,
    value: undefined as T | undefined,
    is: opts.is,
  };

  // Only attach the `default` property when the caller actually supplied one.
  if ("default" in opts && opts.default !== undefined) {
    return { ...base, default: opts.default } as FieldType<T>;
  }

  return base as FieldType<T>;
}

// --------------------
// Schema and Model Types
// --------------------

type ValueMap<F extends Record<string, FieldType<any>>> = {
  [K in keyof F]: F[K] extends FieldType<infer V> ? V : never;
};

/**
 * Keys that are optional in the constructor's input object.
 *
 *  • A key is optional when the field descriptor provides a `default`, _or_
 *  • the declared value type already allows `undefined`.
 */
type OptionalKeys<F extends Record<string, FieldType<any>>> = {
  [K in keyof F]: F[K] extends { default: any }
    ? K
    : undefined extends ValueMap<F>[K]
      ? K
      : never;
}[keyof F];

/**
 * Keys that **must** be provided in the constructor's input object.
 * (Simply the complement of `OptionalKeys`.)
 */
type RequiredKeys<F extends Record<string, FieldType<any>>> = {
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
type InputValueMap<F extends Record<string, FieldType<any>>> = {
  [K in RequiredKeys<F>]: ValueMap<F>[K];
} & {
  [K in OptionalKeys<F>]?: ValueMap<F>[K];
};

// --------------------
// Schema
// --------------------

export class Schema<F extends Record<string, FieldType<any>>> {
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
      const def = (fieldDef as FieldType<any>).default;
      const value =
        supplied !== undefined
          ? supplied
          : typeof def === "function"
            ? (def as () => unknown)()
            : def;

      const field: FieldType<ValueMap<F>[typeof key]> = {
        __t: undefined as unknown as ValueMap<F>[typeof key],
        value: value as ValueMap<F>[typeof key],
        is: fieldDef.is as
          | LogicalConstraint<NonNullable<ValueMap<F>[typeof key]>>
          | undefined,
        // Preserve the original default (value or callable) verbatim
        default: fieldDef.default as FieldType<
          ValueMap<F>[typeof key]
        >["default"],
      };

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
  static tryNew<I extends Record<string, any>>(
    this: {
      new (input: I): Schema<any> & I;
      _schema: Record<string, FieldType<any>>;
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
      const field = this._fields[key];
      const is = field.is;
      if (is && field.value !== undefined && field.value !== null) {
        const result = is(field.value as NonNullable<typeof field.value>);
        if (result !== true) errors.push(`${key}: ${result}`);
      }
    }

    return errors;
  }

  toJSON(): ValueMap<F> {
    const json = {} as ValueMap<F>;
    for (const key in this._fields) {
      json[key] = this._fields[key].value as ValueMap<F>[typeof key];
    }
    return json;
  }
}
