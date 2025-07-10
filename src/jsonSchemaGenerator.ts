/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Extremely lightweight JSON-Schema (Draft-04) generator.
 *
 * NOTE: This implementation is **placeholder quality** – it only supports
 * a subset of Type-A field metadata that currently exists in the codebase so
 * that unit-tests can compile and execute.  As the real, feature-complete
 * generator lands it should replace this file entirely.
 */

import type { FieldType } from "@src/types";

type Metadata = Record<string, FieldType<any> | Record<string, unknown>>;

/**
 * Best-effort runtime type inference used solely by the stop-gap generator.
 * It relies on **defaults** declared in `FieldOpts` because the real generic
 * type information is erased at runtime.
 */
function inferPrimitiveType(field: FieldType<any>): string {
  // Custom override via user-supplied `jsonType` (future-proofing).
  // @ts-expect-error – property may not exist on current FieldType shape.
  if (field.jsonType) return field.jsonType as string;

  if (field.default !== undefined) {
    const raw =
      typeof field.default === "function" ? field.default() : field.default;

    if (raw === null) return "null";
    if (Array.isArray(raw)) return "array";

    const t = typeof raw;
    if (t === "string" || t === "number" || t === "boolean") {
      return t;
    }

    // Map all other primitives / objects to their JSON-Schema counterparts.
    if (t === "bigint") return "number";
    if (t === "object") return "object";
  }

  // Fallback – treat as opaque object.
  return "object";
}

export function generateJsonSchema(
  metadata: Metadata,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(metadata)) {
    // Handle nested schemas (`schemaClass` or `variantClasses`) detected via
    // their identifying properties.  Treat them as `object` for now.
    if ("schemaClass" in (field as any) || "variantClasses" in (field as any)) {
      properties[key] = { type: "object" };
      required.push(key);
      continue;
    }

    // Primitive/array detection based on defaults.
    const jsonType = inferPrimitiveType(field as FieldType<any>);
    properties[key] = { type: jsonType };
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
