import type { SchemaClass } from "@src/schema";

/**
* Internal symbol used to brand a *nested schema wrapper* value at runtime.
* The wrapper object is never inspected directly by the core library – the
* mere presence of the property is enough for the type-system to treat the
* value as `nested<S>`.
*/
const _NESTED_BRAND: unique symbol = Symbol("type-a.nested.brand");

/**
* Compile-time marker representing the **constructed** type of the supplied
* `Schema` class when used inside an `Of<…>` field definition.
*
* ```ts
* class Comment extends Schema.from({ text: Of<one, string>({}) }) {}
* class Post    extends Schema.from({
*   comments: Of<many, nested<Comment>>({ schemaClass: Comment }),
* }) {}
* ```
*
* At runtime the wrapper is simply an object with the brand property pointing
* to the constructor so that helper functions can recover the class when
* needed.
*/
export type nested<S extends SchemaClass> = { readonly [_NESTED_BRAND]: S };

/**
* Runtime helper that returns the branded wrapper and **registers** the schema
* class for later reflective look-ups (currently this side-effect is a
* no-op but reserved for future use).
*/
export function nested<S extends SchemaClass>(schema: S): nested<S> {
  // In the future we may populate a registry for faster look-ups. For now the
  // wrapper object itself is sufficient.
  return { [_NESTED_BRAND]: schema } as nested<S>;
}

/**
* Extract the schema constructor from a `nested<…>` type.
*/
// Extract the schema constructor from a `nested<…>` wrapper *without* enforcing
// that the constructor structurally matches `SchemaClass` at the type level.
//
// This looser constraint avoids brittle compile-time failures in client code
// where the `_schema` static may not be immediately visible (e.g. within the
// same file before declaration hoisting kicks in).  Runtime checks continue to
// rely on the `schemaClass` metadata attached by the `with()` helper, so the
// relaxed type does not compromise safety.

export type _NestedSchemaOf<T> = T extends { readonly [_NESTED_BRAND]: infer S }
  ? S
  : never;
