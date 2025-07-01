/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FieldType } from "./schema";

type SchemaConstructor = { _schema: unknown };
type Metadata = Record<string, FieldType<any> | SchemaConstructor>;

const isSchema = (val: unknown): val is SchemaConstructor =>
  typeof val === "function" && "_schema" in (val as object);

export function generateJsonSchema(metadata: Metadata): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(metadata)) {
    let type: string;

    if ((field as FieldType<any>).jsonType !== undefined) {
      type = (field as FieldType<any>).jsonType;
    } else if (isSchema(field)) {
      type = "object";
    } else {
      type = "object";
    }

    properties[key] = { type };
    required.push(key);
  }

  return {
    $schema: "http://json-schema.org/draft-04/schema#",
    type: "object",
    properties,
    required,
  };
}

export default generateJsonSchema;
