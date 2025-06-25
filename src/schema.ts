/* eslint-disable @typescript-eslint/no-explicit-any */

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
  is?: LogicalConstraint<T>;
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
  is?: LogicalConstraint<T>;
}): FieldType<T>;
export function Of<T extends Typeable>(opts: {
  is?: LogicalConstraint<T>;
}): FieldType<T>;
export function Of<T extends Typeable>(opts: {
  default?: T | (() => T);
  is?: LogicalConstraint<T>;
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
  [K in keyof F as F[K] extends { default: any } ? never : K]: ValueMap<F>[K];
} & {
  // optional when default present
  [K in keyof F as F[K] extends { default: any } ? K : never]?: ValueMap<F>[K];
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
        value: value as ValueMap<F>[typeof key],
        is: fieldDef.is as
          | LogicalConstraint<ValueMap<F>[typeof key]>
          | undefined,
        // Preserve the original default (value or callable) verbatim
        default: fieldDef.default as FieldType<ValueMap<F>[typeof key]>["default"],
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
    };
  }

  validate(): string[] {
    const schema = (this.constructor as unknown as { _schema: F })._schema;
    const errors: string[] = [];

    for (const key in schema) {
      const field = this._fields[key];
      const is = field.is;
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
