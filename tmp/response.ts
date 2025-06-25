import { Schema, Of } from '@rybosome/type-a';

class Response extends Schema.from({ status: Of<"ok" | number>({}) }) {}

const a = new Response({ status: "ok" });
const b = new Response({ status: 429 });
