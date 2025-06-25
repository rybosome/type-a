import { Schema, Of } from './src/index';

class Response extends Schema.from({
  status: Of<"ok" | number>()
}) {}
