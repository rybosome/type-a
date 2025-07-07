# Type-A Documentation Examples

This repository uses **Type-A** for schema validation. The snippets below are **live tests** – they are automatically compiled and executed by the `pnpm docs:test` script to ensure the examples remain correct and type-safe.

```typescript test
import { Schema, Of } from "@rybosome/type-a";

// A simple schema definition using Type-A.
// A `Schema` is created by calling the `Schema.from({ ...fields })` factory.
// Each field uses the `Of<T>(opts?)` helper to declare its type and options.
// Empty `{}` is sufficient when no constraints/defaults are needed.
class User extends Schema.from({
  name: Of<string>({}),
  age: Of<number>({}),
}) {}

// Runtime validation & property access
const u = new User({ name: "Alice", age: 42 });

expect(u.name).toBe("Alice");
expect(u.age).toBe(42);
```

If the snippet above fails to compile or its assertions fail, the documentation
tests will fail in CI, alerting us that the example needs to be updated.
