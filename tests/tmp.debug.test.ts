import { Of } from "@rybosome/type-a";

// purposely create to print stack inside Of, We'll override generatedIs debug.

type Foo = "a" | "b" | "c";

// call Of to inspect
Of<Foo>();
