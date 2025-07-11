import { describe, it, expect } from "vitest";

import { Schema, one, many } from "@rybosome/type-a";
import { generateJsonSchema } from "../src/jsonSchemaGenerator";

/* -------------------------------------------------------------------------- */
/* Test Schemas                                                               */
/* -------------------------------------------------------------------------- */

class Address extends Schema.from({
  street: one().of<string>({ default: "" }),
  city: one().of<string>({ default: "" }),
}) {}

class Person extends Schema.from({
  name: one().of<string>({ default: "" }),
  age: one().of<number>({ default: 0 }),
  /** nested object */
  address: one(Address).of<InstanceType<typeof Address>>({
    default: () => new Address({ street: "", city: "" }),
  }),
}) {}

class Company extends Schema.from({
  companyName: one().of<string>({ default: "" }),
  /** array of nested objects */
  employees: many(Person).of<InstanceType<typeof Person>[]>({ default: [] }),
}) {}

/* -------------------------------------------------------------------------- */
/* Helper                                                                      */
/* -------------------------------------------------------------------------- */

function clean(schema: Record<string, unknown>) {
  // No clean-up needed yet but keep placeholder for future canonicalisation
  return schema;
}

/* -------------------------------------------------------------------------- */
/* Test Cases                                                                  */
/* -------------------------------------------------------------------------- */

describe("generateJsonSchema – primitive and nested object support", () => {
  const jsonSchema = generateJsonSchema(Person._schema as any);

  it("produces draft-04 meta-schema ref", () => {
    expect(jsonSchema.$schema).toBe("http://json-schema.org/draft-04/schema#");
  });

  it("marks top-level as object", () => {
    expect(jsonSchema.type).toBe("object");
  });

  it("includes expected property keys", () => {
    const { properties } = jsonSchema as any;
    expect(Object.keys(properties)).toEqual(["name", "age", "address"]);
  });

  it("infers primitive property types when defaults are provided", () => {
    const { properties } = jsonSchema as any;
    expect(properties.name).toEqual({ type: "string" });
    expect(properties.age).toEqual({ type: "number" });
  });

  it("represents nested Schema as object", () => {
    const { properties } = jsonSchema as any;
    expect(properties.address).toEqual({ type: "object" });
  });
});

describe.skip("generateJsonSchema – array of objects support", () => {
  // TODO(ai-68): The current generator does not emit `type: \"array\"` or an
  // `items` schema for fields created via `many(schemaClass)`. Once generator
  // gains array-handling logic, enable this block and adjust expectations.

  const jsonSchema = generateJsonSchema(Company._schema as any);

  it("identifies array-typed fields", () => {
    const { properties } = jsonSchema as any;
    expect(properties.employees).toEqual({ type: "array" });
  });
});

/* -------------------------------------------------------------------------- */
/* Known-gaps / future work                                                    */
/* -------------------------------------------------------------------------- */

// Enum support ----------------------------------------------------------------

it.skip("supports enum-valued properties", () => {
  // Expected: the generated JSON-Schema should include an `enum` keyword with
  // all possible values.
});

// oneOf / anyOf / allOf --------------------------------------------------------

it.skip("supports combined schemas (oneOf / anyOf / allOf)", () => {
  // Expected: the generator should handle explicit variant unions by emitting
  // the corresponding combinator keywords.
});

// $ref reuse ------------------------------------------------------------------

it.skip("deduplicates nested schemas via $ref", () => {
  // Expected: repeated use of the same nested Schema class should be factored
  // out into a definition and referenced via `$ref`.
});

/* -------------------------------------------------------------------------- */
/* Comprehensive object-literal assertions                                    */
/* -------------------------------------------------------------------------- */

describe("generateJsonSchema – complete equality for primitive & nested object", () => {
  const actual = generateJsonSchema(Person._schema as any);

  const expected = {
    $schema: "http://json-schema.org/draft-04/schema#",
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
      address: { type: "object" },
    },
    required: ["name", "age", "address"],
  } as const;

  it("matches the exact expected JSON schema", () => {
    expect(actual).toEqual(expected);
  });
});

describe("generateJsonSchema – arrays of primitives", () => {
  class NumbersWrapper extends Schema.from({
    numbers: many().of<number[]>({ default: [] }),
  }) {}

  const actual = generateJsonSchema(NumbersWrapper._schema as any);

  const expected = {
    $schema: "http://json-schema.org/draft-04/schema#",
    type: "object",
    properties: {
      numbers: { type: "array" },
    },
    required: ["numbers"],
  } as const;

  it("matches the exact expected JSON schema", () => {
    expect(actual).toEqual(expected);
  });
});

/* -------------------------------------------------------------------------- */
/* Pending complex scenarios ------------------------------------------------- */
/* -------------------------------------------------------------------------- */

describe.skip("generateJsonSchema – nested objects with required & optional properties", () => {
  class Config extends Schema.from({
    mandatory: one().of<string>({}),
    optional: one().of<number>({ default: 42 }),
  }) {}

  const expected = {
    $schema: "http://json-schema.org/draft-04/schema#",
    type: "object",
    properties: {
      mandatory: { type: "string" },
      optional: { type: "number", default: 42 },
    },
    required: ["mandatory"],
  };

  const actual = generateJsonSchema(Config._schema as any);

  it("would generate required/optional correctly", () => {
    expect(actual).toEqual(expected);
  });
});

describe.skip("generateJsonSchema – arrays of objects", () => {
  const actual = generateJsonSchema(Company._schema as any);

  const expected = {
    $schema: "http://json-schema.org/draft-04/schema#",
    type: "object",
    properties: {
      companyName: { type: "string" },
      employees: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
            address: { type: "object" },
          },
          required: ["name", "age", "address"],
        },
      },
    },
    required: ["companyName", "employees"],
  };

  it("would produce array of object schema with items", () => {
    expect(actual).toEqual(expected);
  });
});

// Additional bullet scenarios (enum, unions, combinators etc.) below as skipped suites

describe.skip("generateJsonSchema – enum types & literal unions", () => {
  /* Implementation pending in JSON-Schema generator */
});

describe.skip("generateJsonSchema – oneOf/anyOf/allOf combinations", () => {});

describe.skip("generateJsonSchema – $ref reuse & recursive schemas", () => {});

describe.skip("generateJsonSchema – patternProperties & additionalProperties", () => {});

describe.skip("generateJsonSchema – nullable types & defaults", () => {});

describe.skip("generateJsonSchema – deeply nested combinations", () => {});
