import { generateJsonSchema } from '../src/generateJsonSchema';

describe('generateJsonSchema', () => {
  describe('simple primitive fields', () => {
    it('generates schema for string, number, boolean', () => {
      const definition = { name: 'string', age: 'number', isActive: 'boolean' };
      const schema = generateJsonSchema(definition);
      expect(schema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          isActive: { type: 'boolean' },
        },
        required: ['name', 'age', 'isActive'],
      });
    });
  });

  describe('nested object schemas', () => {
    it('generates schema for nested objects', () => {
      const definition = {
        user: {
          firstName: 'string',
          lastName: 'string',
          address: {
            street: 'string',
            city: 'string',
            zipCode: 'number',
          },
        },
      };
      const schema = generateJsonSchema(definition);
      expect(schema).toEqual({
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                  zipCode: { type: 'number' },
                },
                required: ['street', 'city', 'zipCode'],
              },
            },
            required: ['firstName', 'lastName', 'address'],
          },
        },
        required: ['user'],
      });
    });
  });

  describe('arrays and recursive schemas', () => {
    it('generates schema for arrays of primitives', () => {
      const definition = { tags: ['string'] };
      const schema = generateJsonSchema(definition);
      expect(schema).toEqual({
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['tags'],
      });
    });

    it('generates recursive schema for self-referencing types', () => {
      const definition = {
        name: 'string',
        children: ['self'],
      };
      const schema = generateJsonSchema(definition, { name: 'Node' });
      expect(schema).toEqual({
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: 'Node',
        type: 'object',
        properties: {
          name: { type: 'string' },
          children: {
            type: 'array',
            items: { $ref: 'Node' },
          },
        },
        required: ['name', 'children'],
      });
    });
  });

  describe('edge cases', () => {
    it('handles optional fields', () => {
      const definition = {
        requiredField: 'string',
        optionalField: { type: 'number', optional: true },
      };
      const schema = generateJsonSchema(definition);
      expect(schema).toEqual({
        type: 'object',
        properties: {
          requiredField: { type: 'string' },
          optionalField: { type: 'number' },
        },
        required: ['requiredField'],
      });
    });

    it('applies custom type hints', () => {
      const definition = {
        createdAt: 'date',
      };
      const customTypeHints = {
        date: { type: 'string', format: 'date-time' },
      };
      const schema = generateJsonSchema(definition, { typeHints: customTypeHints });
      expect(schema).toEqual({
        type: 'object',
        properties: {
          createdAt: { type: 'string', format: 'date-time' },
        },
        required: ['createdAt'],
      });
    });
  });
});
