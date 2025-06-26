import { Of } from "../src/schema";
import type { InputValueMap } from "../src/schema";

const schema = {
  required: Of<string>({}),
  optional: Of<string | undefined>({}),
  optionalDefault: Of<string>({ default: "hi" }),
  nullable: Of<string | null>({}),
  optionalNullable: Of<string | null | undefined>({}),
} as const;

const ok: InputValueMap<typeof schema> = { required: "x", nullable: null };
