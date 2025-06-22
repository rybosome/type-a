/* eslint-disable @typescript-eslint/no-explicit-any */

// --------------------
// Primitive & Constraints
// --------------------

export type Typeable = string | number | boolean;

export type LogicalConstraint<T extends Typeable> = (val: T) => true | string;

export interface FieldType<T extends Typeable> {
  value: T | undefined;
  logical?: LogicalConstraint<T>;
}

export function Field<T extends Typeable>(opts: {
  logical?: LogicalConstraint<T>;
}): FieldType<T> {
  return {
    value: undefined,
    logical: opts.logical,
  };
}

// --------------------
// Schema and Model Types
// --------------------

type ValueMap<F extends Record<string, FieldType<any>>> = {
  [K in keyof F]: F[K] extends FieldType<infer V> ? V : never;
};

// --------------------
// Schema
// --------------------

export class Schema<F extends Record<string, FieldType<any>>> {
  // store backing fields
  private readonly _fields: {
    [K in keyof F]: FieldType<ValueMap<F>[K]>;
  };

  constructor(input: ValueMap<F>) {
    const schema = (this.constructor as unknown as { _schema: F })._schema;

    const fields = {} as {
      [K in keyof F]: FieldType<ValueMap<F>[K]>;
    };

    // iterate using Object.entries and strongly typed K
    for (const [key, fieldDef] of Object.entries(schema) as [
      keyof F,
      F[keyof F],
    ][]) {
      const value = input[key];

      const field: FieldType<ValueMap<F>[typeof key]> = {
        value,
        logical: fieldDef.logical as
          | LogicalConstraint<ValueMap<F>[typeof key]>
          | undefined,
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

  static with<F extends Record<string, FieldType<any>>>(schema: F) {
    class ModelWithSchema extends Schema<F> {
      static _schema = schema;
    }

    return ModelWithSchema as {
      new (input: ValueMap<F>): Schema<F> & ValueMap<F>;
      _schema: F;
    };
  }

  validate(): string[] {
    const schema = (this.constructor as unknown as { _schema: F })._schema;
    const errors: string[] = [];

    for (const key in schema) {
      const field = this._fields[key];
      const logical = field.logical;
      if (logical) {
        if (field.value !== undefined) {
          const result = logical(field.value);
          if (result !== true) {
            errors.push(`${key}: ${result}`);
          }
        }
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
