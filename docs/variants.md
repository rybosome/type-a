# Variants (discriminated unions)

```typescript test
import { Schema, Of, Variant } from "@rybosome/type-a";

class Dog extends Schema.from({ kind: Of<"dog">(), woof: Of.string() }) {}
class Cat extends Schema.from({ kind: Of<"cat">(), meow: Of.string() }) {}

class PetOwner extends Schema.from({
  pet: Of<Variant<[typeof Dog, typeof Cat]>>({
    variantClasses: [Dog, Cat],
  }),
}) {}

const o = new PetOwner({ pet: { kind: "cat", meow: "nya" } });
o.pet.meow; // "nya" – correctly typed as Cat

// Validation of wrong discriminator fails
const bad = new PetOwner({ pet: { kind: "frog" } } as any);
const errs = bad.validate();
console.log(errs); // => [ 'pet: expected finite number' ]
```
