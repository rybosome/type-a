import { Of } from "../src/schema";

const field = Of<string | undefined>({});
// We cannot print types at compile time easily.
