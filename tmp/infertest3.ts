import { Of } from "../src/schema";
import type { InputValueMap } from "../src/schema";

const schema = { optional: Of<string | undefined>({}) } as const;

// Should allow omit 'optional' because optional key
const obj: InputValueMap<typeof schema> = {};
