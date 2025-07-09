# Variants (discriminated unions)

```typescript test
import { Schema, Of, Variant, one } from "@rybosome/type-a";

class Dog extends Schema.from({
  kind: Of<one, "dog">({}),
  woof: Of<one, string>({}),
}) {}

class Cat extends Schema.from({
  kind: Of<one, "cat">({}),
  meow: Of<one, string>({}),
}) {}

class PetOwner extends Schema.from({
  pet: Of<one, Variant<[typeof Dog, typeof Cat]>>({
    variantClasses: [Dog, Cat],
  }),
}) {}

const o = new PetOwner({ pet: { kind: "cat", meow: "nya" } });
// Narrow union via `as const` assertion or by widening variable
const cat = o.pet as Cat;
cat.meow; // "nya" – correctly typed as Cat

// Validation of wrong discriminator fails
const bad = new PetOwner({ pet: { kind: "frog" } } as any);
const errs = bad.validate();
console.log(errs); // => [ 'pet: expected finite number' ]
```
