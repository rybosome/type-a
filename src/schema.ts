/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ErrLog, Result } from "./types/result";

// --------------------
// Primitive & Constraints
// --------------------

export type Typeable = string | number | boolean;

export type LogicalConstraint<T extends Typeable> = (val: T) => true | string;

/**
 * A field description used by Schema.
 *
 * - `value`   – runtime value
 * - `default` – optional default applied when the caller omits the field
 * - `is`      – optional validation constraint
 */
export interface FieldType<T extends Typeable> {
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
  is?: LogicalConstraint<T> | LogicalConstraint<T>[];
}

/* ------------------------------------------------------------------ */
/* Of                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Create a field descriptor.
 *
 * Overload #1 – with default value
 * Overload #2 – without default value
 */
export function Of<T extends Typeable>(opts: {
  default: T | (() => T);
  is?: LogicalConstraint<T> | LogicalConstraint<T>[];
}): FieldType<T>;
export function Of<T extends Typeable>(opts: {
  is?: LogicalConstraint<T> | LogicalConstraint<T>[];
}): FieldType<T>;
export function Of<T extends Typeable>(opts: {
  default?: T | (() => T);
  is?: LogicalConstraint<T> | LogicalConstraint<T>[];
}): FieldType<T> {
  return {
    value: undefined,
    default: opts.default,
    is: opts.is,
  };
}

// --------------------
// Schema and Model Types
// --------------------

type ValueMap<F extends Record<string, FieldType<any>>> = {
  [K in keyof F]: F[K] extends FieldType<infer V> ? V : never;
};

/**
 * Compute constructor input map:
 * • Keys with an explicit default are optional.
 * • Keys without a default are required.
 */
type InputValueMap<F extends Record<string, FieldType<any>>> = {
  // required when no default
  [K in keyof F as F[K] extends { default?: any } ? never : K]: ValueMap<F>[K];
} & {
  // optional when default present
  [K in keyof F as F[K] extends { default?: any } ? K : never]?: ValueMap<F>[K];
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
        value: value as ValueMap<F>[typeof key],
        // Normalise `is` so `_fields` always stores a single function
        is: (() => {
          const rawIs = fieldDef.is as
            | LogicalConstraint<ValueMap<F>[typeof key]>
            | LogicalConstraint<ValueMap<F>[typeof key]>[]
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
      // initialise all expected keys
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

    // expose complete list of messages
    errLog.summarize = () => validationErrors.slice();

    return { val: undefined, errs: errLog };
  }

  validate(): string[] {
    const schema = (this.constructor as unknown as { _schema: F })._schema;
    const errors: string[] = [];

    for (const key in schema) {
      const field = this._fields[key as keyof F];

      // Cast `is` so we have a stable, callable signature
      const is = field.is as ((val: unknown) => true | string) | undefined;

      if (is && field.value !== undefined) {
        const result = is(field.value);
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
