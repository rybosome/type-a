/* eslint-disable @typescript-eslint/no-explicit-any */

import { generateJsonSchema } from "./jsonSchemaGenerator";

// --------------------
// Primitive & Constraints
// --------------------

export type Typeable = string | number | boolean;

export type LogicalConstraint<T extends Typeable> = (val: T) => true | string;

export interface FieldType<T extends Typeable> {
  value: T | undefined;
  is?: LogicalConstraint<T>;
  jsonType: "string" | "number" | "boolean" | "object";
}

// ---------------------------------------------------------------------------
//  NEW - Helper types for nested schemas
// ---------------------------------------------------------------------------
type SchemaClass = { new (input: any): Schema<any>; _schema: Record<string, any> };
type SchemaField = FieldType<any> | SchemaClass;

// Keep Of<T> helper untouched
export function Of<T extends Typeable>(opts: {
  is?: LogicalConstraint<T>;
  default?: T;
}): FieldType<T> {
  const jsonType =
    opts.default !== undefined
      ? (typeof opts.default as "string" | "number" | "boolean")
      : ("string" as const);
  return {
    value: opts.default,
    is: opts.is,
    jsonType,
  };
}

// --------------------
// Schema and Model Types
// --------------------

// Extract the runtime value type from either a primitive FieldType or a nested Schema.
type ValueMap<F extends Record<string, SchemaField>> = {
  [K in keyof F]: F[K] extends FieldType<infer V>
    ? V
    : F[K] extends SchemaClass
      ? InstanceType<F[K]>
      : never;
};

// --------------------
// Schema
// --------------------

export class Schema<F extends Record<string, SchemaField>> {
  private readonly _fields: Record<string, FieldType<any>>;

  constructor(input: ValueMap<F>) {
    const schema = (this.constructor as unknown as { _schema: F })._schema;

    const fields: Record<string, FieldType<any>> = {};

    for (const [key, fieldDef] of Object.entries(schema) as [
      keyof F,
      F[keyof F],
    ][]) {
      const value = input[key];

      // Primitive field definitions
      if ((fieldDef as FieldType<any>).jsonType !== undefined) {
        const def = fieldDef as FieldType<any>;
        fields[key as string] = {
          value,
          is: def.is,
          jsonType: def.jsonType,
        };
      } else {
        // Nested schema – treat as plain object for validation / JSON-Schema purposes
        fields[key as string] = {
          // Nested objects are not limited to the Typeable set
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          value,
          jsonType: "object",
        } as FieldType<any>;
      }

      const fieldRef = fields[key as string];

      Object.defineProperty(this, key, {
        get: () => fieldRef.value,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        set: (val: any) => {
          fieldRef.value = val;
        },
        enumerable: true,
      });
    }

    this._fields = fields;
  }

  static from<S extends Record<string, SchemaField>>(schema: S) {
    class ModelWithSchema extends Schema<S> {
      static _schema = schema;
    }

    return ModelWithSchema as {
      new (input: ValueMap<S>): Schema<S> & ValueMap<S>;
      _schema: S;
      /**
       * Returns a JSON-Schema Draft-04 representation of **this** schema.
       */
      jsonSchema(): Record<string, unknown>;
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
        if (result !== true) {
          errors.push(`${key}: ${result}`);
        }
      }
    }

    return errors;
  }

  toJSON(): ValueMap<F> {
    // Use a mutatable intermediate to avoid excess-index errors,
    // then cast to the expected strongly-typed shape.
    const json: any = {};
    for (const key in this._fields) {
      json[key] = this._fields[key].value;
    }
    return json as ValueMap<F>;
  }

  /**
   * Returns a JSON-Schema Draft-04 representation of **this** schema.
   */
  static jsonSchema(): Record<string, unknown> {
    const cls = this as unknown as { _schema: Record<string, SchemaField> };
    return generateJsonSchema(cls._schema);
  }
}
