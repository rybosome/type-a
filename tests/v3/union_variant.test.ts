import { describe, it, expect } from "vitest";

import { Schema } from "@src/schema";
import { one } from "@src/field";
import { t } from "@src/typed";

/* ------------------------------------------------------------------------- */
/* Union (`t.union`)                                                         */
/* ------------------------------------------------------------------------- */

class CoordA extends Schema.from({
  x: one(t.number),
}) {}

class CoordB extends Schema.from({
  y: one(t.number),
}) {}

class Shape extends Schema.from({
  coord: one(t.union([CoordA, CoordB])),
}) {}

describe("v3 – union & variant integration", () => {
  it("instantiates the correct ctor for union specs", () => {
    const s1 = new Shape({ coord: { x: 1 } });
    expect(s1.coord).toBeInstanceOf(CoordA);

    const s2 = new Shape({ coord: { y: 2 } });
    expect(s2.coord).toBeInstanceOf(CoordB);
  });

  it("validates nested union branches", () => {
    const bad = new Shape({ coord: { x: "nope" as unknown as number } });
    const errs = bad.validate();
    expect(errs).toContain("coord.x: expected number");
  });

  it("emits correct JSON Schema for union fields", () => {
    const schema = Shape.jsonSchema();
    expect(schema).toMatchObject({
      properties: {
        coord: {
          oneOf: [CoordA.jsonSchema(), CoordB.jsonSchema()],
        },
      },
    });
  });

  /* --------------------------------------------------------------------- */
  /* Variant (`t.variant`)                                                  */
  /* --------------------------------------------------------------------- */

  class Cat extends Schema.from({
    kind: one(t.literal("cat")),
    meows: one(t.boolean),
  }) {}

  class Dog extends Schema.from({
    kind: one(t.literal("dog")),
    barks: one(t.boolean),
  }) {}

  class PetOwner extends Schema.from({
    pet: one(t.variant([Cat, Dog])),
  }) {}

  it("instantiates discriminated variant branches correctly", () => {
    const o1 = new PetOwner({ pet: { kind: "cat", meows: true } });
    expect(o1.pet).toBeInstanceOf(Cat);

    const o2 = new PetOwner({ pet: { kind: "dog", barks: true } });
    expect(o2.pet).toBeInstanceOf(Dog);
  });

  it("rejects inputs missing the discriminator or with invalid shape", () => {
    const o = new PetOwner({ pet: { meows: true } as any });
    const errs = o.validate();
    expect(errs.length).toBeGreaterThan(0);
    expect(errs).toContain("pet.kind: is required");
  });

  it("emits JSON Schema with `oneOf` and `discriminator`", () => {
    const schema = PetOwner.jsonSchema();
    expect(schema).toMatchObject({
      properties: {
        pet: {
          oneOf: [Cat.jsonSchema(), Dog.jsonSchema()],
          discriminator: { propertyName: "kind" },
        },
      },
    });
  });
});
