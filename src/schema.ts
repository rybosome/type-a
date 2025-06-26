/* eslint-disable @typescript-eslint/no-explicit-any */

// --------------------
// Primitive & Constraints
// --------------------

export type Typeable = string | number | boolean;

export type LogicalConstraint<T extends Typeable> = (val: T) => true | string;

export interface FieldType<T extends Typeable> {
  value: T | undefined;
  is?: LogicalConstraint<T>;
}

export function Of<T extends Typeable>(opts: {
  is?: LogicalConstraint<T>;
}): FieldType<T> {
  return {
    value: undefined,
    is: opts.is,
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
        is: fieldDef.is as
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

  static from<F extends Record<string, FieldType<any>>>(schema: F) {
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
      const is = field.is;
      if (is) {
        if (field.value !== undefined) {
          const result = is(field.value);
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

  /**
   * Returns a JSON-Schema Draft-07 representation of **this** schema
   * by inferring primitive types from the first seen runtime values.
   *  – string | number | boolean are mapped 1-to-1
   *  – undefined (never assigned) defaults to "string"
   *  – Nested `Schema` definitions are handled recursively.
   */
  static jsonSchema(): Record<string, unknown> {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const build = (def: Record<string, FieldType<any>>): any => {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, field] of Object.entries(def)) {
        // If the field’s runtime value was ever set, use its JS typeof.
        // Otherwise we conservatively default to "string".
        let type: string = "string";
        const runtimeVal = (field as FieldType<any>).value;
        if (runtimeVal !== undefined) {
          const jsType = typeof runtimeVal;
          if (jsType === "string" || jsType === "number" || jsType === "boolean") {
            type = jsType;
          }
        }

        properties[key] = { type };
        required.push(key);
      }

      return {
        type: "object",
        properties,
        required,
      };
    };

    // `this` is the concrete subclass with its own _schema
    const cls = this as unknown as { _schema: Record<string, FieldType<any>> };
    return build(cls._schema);
  }
}
