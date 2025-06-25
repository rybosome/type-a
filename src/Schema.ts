import generateJsonSchema from './generateJsonSchema';

class Schema {
  static jsonSchema() {
    return generateJsonSchema(this.definition);
  }
}

export default Schema;
