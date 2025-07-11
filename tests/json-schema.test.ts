import { describe, it, expect } from "vitest";

import {
  Schema,
  one,
  many,
  typed as t, // alias exported by src/index.ts
} from "@rybosome/type-a";

/* ------------------------------------------------------------------------- */
/* Helper to deep-clone generated output (avoids mutation side-effects)       */
/* ------------------------------------------------------------------------- */
function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

/* ------------------------------------------------------------------------- */
/* 1. Required vs optional properties                                         */
/* ------------------------------------------------------------------------- */

describe("jsonSchema – required vs optional properties", () => {
  class Example extends Schema.from({
    requiredProp: one(t.string),
    optionalProp: one(t.string, { optional: true }),
  }) {}

  const actual = Example.jsonSchema();

  const expected = {
    type: "object",
    properties: {
      requiredProp: { type: "string" },
      optionalProp: { type: "string" },
    },
    required: ["requiredProp"],
  } as const;

  it("matches full object literal", () => {
    expect(clone(actual)).toStrictEqual(expected);
  });
});

/* ------------------------------------------------------------------------- */
/* 2. Arrays of objects and primitives                                        */
/* ------------------------------------------------------------------------- */

describe("jsonSchema – arrays of objects & primitives", () => {
  class Person extends Schema.from({
    name: one(t.string),
    age: one(t.number),
  }) {}

  class List extends Schema.from({
    people: many(Person),
    tags: many(t.string),
  }) {}

  const actual = List.jsonSchema();

  const expectedPerson = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
    required: ["name", "age"],
  } as const;

  const expected = {
    type: "object",
    properties: {
      people: { type: "array", items: expectedPerson },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["people", "tags"],
  } as const;

  it("renders arrays correctly", () => {
    expect(clone(actual)).toStrictEqual(expected);
  });
});

/* ------------------------------------------------------------------------- */
/* 3. Enums                                                                   */
/* ------------------------------------------------------------------------- */

describe("jsonSchema – enum properties", () => {
  const Color = { red: "red", green: "green", blue: "blue" } as const;

  class Paint extends Schema.from({
    color: one(t.enum(Color)),
  }) {}

  const actual = Paint.jsonSchema();

  const expected = {
    type: "object",
    properties: {
      color: { type: "string", enum: ["red", "green", "blue"] },
    },
    required: ["color"],
  } as const;

  it("matches enum schema exactly", () => {
    expect(clone(actual)).toStrictEqual(expected);
  });
});

/* ------------------------------------------------------------------------- */
/* 4. oneOf combinations (union helper)                                       */
/* ------------------------------------------------------------------------- */

describe("jsonSchema – oneOf union", () => {
  class Cat extends Schema.from({
    kind: one(t.literal("cat")),
    meow: one(t.string),
  }) {}

  class Dog extends Schema.from({
    kind: one(t.literal("dog")),
    bark: one(t.string),
  }) {}

  class Owner extends Schema.from({
    pet: one(t.union([Cat, Dog])),
  }) {}

  const actual = Owner.jsonSchema();

  const expectedCat = {
    type: "object",
    properties: {
      kind: { type: "string", const: "cat" },
      meow: { type: "string" },
    },
    required: ["kind", "meow"],
  } as const;

  const expectedDog = {
    type: "object",
    properties: {
      kind: { type: "string", const: "dog" },
      bark: { type: "string" },
    },
    required: ["kind", "bark"],
  } as const;

  const expected = {
    type: "object",
    properties: {
      pet: {
        oneOf: [expectedCat, expectedDog],
      },
    },
    required: ["pet"],
  } as const;

  it("emits oneOf with full branch schemas", () => {
    expect(clone(actual)).toStrictEqual(expected);
  });
});

/* ------------------------------------------------------------------------- */
/* 5. additionalProperties via map helper                                     */
/* ------------------------------------------------------------------------- */

describe("jsonSchema – additionalProperties map support", () => {
  class ScoreMap extends Schema.from({
    scores: one(t.map(t.string, t.number)),
  }) {}

  const actual = ScoreMap.jsonSchema();

  const expected = {
    type: "object",
    properties: {
      scores: {
        type: "object",
        additionalProperties: { type: "number" },
        propertyNames: { type: "string" },
      },
    },
    required: ["scores"],
  } as const;

  it("emits additionalProperties correctly", () => {
    expect(clone(actual)).toStrictEqual(expected);
  });
});

/* ------------------------------------------------------------------------- */
/* 6. Default values (non-required fields)                                    */
/* ------------------------------------------------------------------------- */

describe("jsonSchema – default values remove property from required", () => {
  class WithDefaults extends Schema.from({
    name: one(t.string, { default: "Anon" }),
  }) {}

  const actual = WithDefaults.jsonSchema();

  const expected = {
    type: "object",
    properties: {
      name: { type: "string", default: "Anon" },
    },
  } as const;

  it("includes default and omits required array", () => {
    expect(clone(actual)).toStrictEqual(expected);
  });
});

/* ------------------------------------------------------------------------- */
/* Skipped scenarios – edge-cases not yet fully supported                      */
/* ------------------------------------------------------------------------- */

it.skip("jsonSchema – nullable properties (pending implementation)", () => {
  class Nullable extends Schema.from({
    maybe: one(t.string, { nullable: true }),
  }) {}

  const expected = {
    type: "object",
    properties: {
      maybe: { type: ["string", "null"] },
    },
    required: ["maybe"],
  } as const;

  // expect(Nullable.jsonSchema()).toStrictEqual(expected);
});

it.skip("jsonSchema – anyOf / allOf combinations (not implemented)", () => {
  // Expected: union / intersection helpers should allow emitting `anyOf` and
  // `allOf` keys in addition to the supported `oneOf`.
});

it.skip("jsonSchema – $ref reuse and recursive types (pending)", () => {
  // Expected: repeated nested Schema classes should be factored out into a
  // single definition and referenced via `$ref`. Recursive definitions should
  // self-reference to avoid infinite expansion.
});

it.skip("jsonSchema – patternProperties support (not implemented)", () => {
  // Expected: `t.map()` with a constrained key should surface
  // `patternProperties` in addition to (or instead of) `propertyNames`.
});

it.skip("jsonSchema – deeply nested combinations (snapshot placeholder)", () => {
  // Construct a deeply nested schema mixing arrays, maps, unions, etc. Once
  // jsonSchema() stabilises this test should assert full equality.
});
