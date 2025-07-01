import { describe, it, expect } from "vitest";
import { Schema, Of, aUUID, atLeast } from "@rybosome/type-a";

describe("Schema.jsonSchema()", () => {
  class User extends Schema.from({
    id: Of<string>({ is: aUUID, default: "" }),
    age: Of<number>({ is: atLeast(18), default: 0 }),
    active: Of<boolean>({ default: true }),
  }) {}

  it("produces a valid JSON-Schema for primitive fields", () => {
    expect(User.jsonSchema()).toEqual({
      $schema: "http://json-schema.org/draft-04/schema#",
      type: "object",
      properties: {
        id: { type: "string" },
        age: { type: "number" },
        active: { type: "boolean" },
      },
      required: ["id", "age", "active"],
    });
  });
});

describe('jsonSchema with nested schemas', () => {
  it('supports nested schemas', () => {
    class Address extends Schema.from({
      street: Of<string>({ default: '' }),
      city:   Of<string>({ default: '' })
    }) {}
    class User extends Schema.from({
      id:      Of<string>({ default: '' }),
      address: Address
    }) {}
    const schema = User.jsonSchema();
    expect(schema).toEqual({
      $schema:    'http://json-schema.org/draft-04/schema#',
      type:       'object',
      properties: {
        id:      { type: 'string' },
        address: { $ref: '#/definitions/Address' }
      },
      required: ['id', 'address'],
      definitions: {
        Address: {
          type:       'object',
          properties: {
            street: { type: 'string' },
            city:   { type: 'string' }
          },
          required: ['street', 'city']
        }
      }
    });
  });
});

describe('jsonSchema with recursive nested schemas', () => {
  it('supports recursive nested schemas scenario', () => {
    class GrandChild extends Schema.from({
      age: Of<number>({ default: 0 })
    }) {}
    class Child extends Schema.from({
      name:       Of<string>({ default: '' }),
      grandChild: GrandChild
    }) {}
    class Parent extends Schema.from({
      label: Of<string>({ default: '' }),
      child: Child
    }) {}
    const schema = Parent.jsonSchema();
    expect(schema).toEqual({
      $schema:    'http://json-schema.org/draft-04/schema#',
      type:       'object',
      properties: {
        label: { type: 'string' },
        child: { $ref: '#/definitions/Child' }
      },
      required: ['label', 'child'],
      definitions: {
        Child: {
          type:       'object',
          properties: {
            name:       { type: 'string' },
            grandChild: { $ref: '#/definitions/GrandChild' }
          },
          required: ['name', 'grandChild']
        },
        GrandChild: {
          type:       'object',
          properties: {
            age: { type: 'number' }
          },
          required: ['age']
        }
      }
    });
  });
});
