# Discriminated unions

The `Of()` helper now supports *explicit* discriminated unions between several
`Schema` subclasses.  You declare the union at the type level with
`DiscriminatedUnion<[A, B, …]>` and pass the matching constructors via the
`schemaClasses` option.

```typescript
import { Schema, Of, DiscriminatedUnion } from "@rybosome/type-a";

class Dog extends Schema.from({ kind: Of<"dog">(), barkDb: Of<number>() }) {}
class Cat extends Schema.from({ kind: Of<"cat">(), lives: Of<number>() }) {}

class PetOwner extends Schema.from({
  pet: Of<DiscriminatedUnion<[typeof Dog, typeof Cat]>>({
    schemaClasses: [Dog, Cat],
  }),
}) {}

// Raw JSON → correct subtype instance ---------------------------

const o1 = new PetOwner({ pet: { kind: "dog", barkDb: 80 } });
o1.pet.barkDb;           // 80 – o1.pet is *Dog*

const o2 = new PetOwner({ pet: { kind: "cat", lives: 9 } });
o2.pet.lives;            // 9 – o2.pet is *Cat*

// Serialisation keeps the original shape -----------------------

console.log(o2.toJSON());
// → { pet: { kind: "cat", lives: 9 } }
```

The same pattern works for arrays, nested schemas, and `null`able values:

```typescript
class Zoo extends Schema.from({
  residents: Of<DiscriminatedUnion<[typeof Dog, typeof Cat]>[]>({
    schemaClasses: [Dog, Cat],
  }),
  maybePet: Of<DiscriminatedUnion<[typeof Dog, typeof Cat]> | null>({
    schemaClasses: [Dog, Cat],
  }),
}) {}
```

⚠️  **Note:** writing `Of<Dog | Cat>()` *without* `schemaClasses` still compiles,
but the library will treat the field as an opaque value – no automatic
re-hydration or validation is performed. Always pass `schemaClasses` when you
need full Schema behaviour.
