import { Schema, Of } from '../src/schema';

class Model extends Schema.from({ flag: Of<boolean>({ default: true }) }) {}

const m = new Model({});
