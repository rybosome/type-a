import type { FieldType } from "./schema";

type Metadata = Record<string, FieldType<any>>;

export function generateJsonSchema(metadata: Metadata): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(metadata)) {
    properties[key] = { type: field.jsonType };
    required.push(key);
  }

  return {
    // Use JSON-Schema Draft-04
    $schema: "http://json-schema.org/draft-04/schema#",
    type: "object",
    properties,
    required,
  };
}

export default generateJsonSchema;
