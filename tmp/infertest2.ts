import { Of } from "../src/schema";
import type { InputValueMap } from "../src/schema";

const schema = {
  required: Of<string>({}),
  optionalDefault: Of<string>({ default: "hi" }),
} as const;

const ok: InputValueMap<typeof schema> = { required: "foo" }; // omit optionalDefault ok
