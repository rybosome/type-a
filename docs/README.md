# Type-A Documentation Examples

This repository uses **Type-A** for schema validation. The snippets below are **live tests** – they are automatically compiled and executed by the `pnpm docs:test` script to ensure the examples remain correct and type-safe.

```typescript test
import { Schema, one } from "@rybosome/type-a";

// A simple schema definition using Type-A.
class User extends Schema.from({
  name: one().of<string>({}),
  age: one().of<number>({}),
}) {}

// Runtime validation & property access
const u = new User({ name: "Alice", age: 42 });

expect(u.name).toBe("Alice");
expect(u.age).toBe(42);
```

If the snippet above fails to compile or its assertions fail, the documentation
tests will fail in CI, alerting us that the example needs to be updated.
