/**
 * Recursively generates a JSON Schema (Draft-07) from a custom schema definition.
 * @param {object} def - The custom schema definition.
 * @returns {object} - The generated JSON Schema.
 */
function generateJsonSchema(def) {
  if (typeof def !== 'object' || def === null) {
    throw new TypeError('Schema definition must be a non-null object');
  }

  const schema = {};

  // Common keywords
  if (def.title !== undefined) {
    schema.title = def.title;
  }
  if (def.description !== undefined) {
    schema.description = def.description;
  }
  if (def.default !== undefined) {
    schema.default = def.default;
  }
  if (def.enum !== undefined) {
    if (!Array.isArray(def.enum)) {
      throw new TypeError('enum must be an array');
    }
    schema.enum = [...def.enum];
  }
  if (def.const !== undefined) {
    schema.const = def.const;
  }
  if (def.examples !== undefined) {
    if (!Array.isArray(def.examples)) {
      throw new TypeError('examples must be an array');
    }
    schema.examples = [...def.examples];
  }

  // Combinators
  ['oneOf', 'anyOf', 'allOf'].forEach((keyword) => {
    if (def[keyword] !== undefined) {
      if (!Array.isArray(def[keyword])) {
        throw new TypeError(`${keyword} must be an array`);
      }
      schema[keyword] = def[keyword].map((subDef) => generateJsonSchema(subDef));
    }
  });
  if (def.not !== undefined) {
    schema.not = generateJsonSchema(def.not);
  }

  // Type handling
  if (def.type !== undefined) {
    schema.type = def.type;

    switch (def.type) {
      case 'object': {
        const properties = {};
        const required = [];

        if (def.properties !== undefined) {
          if (typeof def.properties !== 'object' || def.properties === null) {
            throw new TypeError('properties must be a non-null object');
          }
          for (const [key, propDef] of Object.entries(def.properties)) {
            properties[key] = generateJsonSchema(propDef);
          }
        }

        if (def.required !== undefined) {
          if (!Array.isArray(def.required)) {
            throw new TypeError('required must be an array');
          }
          def.required.forEach((prop) => {
            if (typeof prop !== 'string') {
              throw new TypeError('required items must be strings');
            }
            required.push(prop);
          });
        }

        schema.properties = properties;
        if (required.length > 0) {
          schema.required = required;
        }
        if (def.additionalProperties !== undefined) {
          schema.additionalProperties = def.additionalProperties;
        }
        break;
      }

      case 'array': {
        if (def.items === undefined) {
          throw new TypeError('items is required for array type');
        }
        schema.items = generateJsonSchema(def.items);
        if (def.minItems !== undefined) {
          schema.minItems = def.minItems;
        }
        if (def.maxItems !== undefined) {
          schema.maxItems = def.maxItems;
        }
        if (def.uniqueItems !== undefined) {
          schema.uniqueItems = def.uniqueItems;
        }
        break;
      }

      case 'string': {
        if (def.minLength !== undefined) {
          schema.minLength = def.minLength;
        }
        if (def.maxLength !== undefined) {
          schema.maxLength = def.maxLength;
        }
        if (def.pattern !== undefined) {
          schema.pattern = def.pattern;
        }
        if (def.format !== undefined) {
          schema.format = def.format;
        }
        break;
      }

      case 'number':
      case 'integer': {
        if (def.minimum !== undefined) {
          schema.minimum = def.minimum;
        }
        if (def.maximum !== undefined) {
          schema.maximum = def.maximum;
        }
        if (def.exclusiveMinimum !== undefined) {
          schema.exclusiveMinimum = def.exclusiveMinimum;
        }
        if (def.exclusiveMaximum !== undefined) {
          schema.exclusiveMaximum = def.exclusiveMaximum;
        }
        if (def.multipleOf !== undefined) {
          schema.multipleOf = def.multipleOf;
        }
        break;
      }

      case 'boolean':
      case 'null':
        // no extra constraints
        break;

      default:
        // unknown type, let JSON Schema validators handle
        break;
    }
  }

  return schema;
}

export default generateJsonSchema;
