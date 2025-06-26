import { Of } from '../src/schema';
import type { InputValueMap } from '../src/schema';

type Schema = {
  required: ReturnType<typeof Of<string>>;
};
