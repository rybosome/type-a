# Report: Blockers to removing `any` from `src/schema.ts`

The goal was to replace every explicit use of `any` in `src/schema.ts` with a
stricter type while keeping the current public API 100 % intact and all tests
passing. During the spike several approaches were explored (see notes below),
but a handful of `any`s turned out to be unavoidable due to limitations in
TypeScript’s type system.

## Summary of irreducible `any` usages

| Line | Code (trimmed) | Why `any` is required |
|------|----------------|------------------------|
|   69 | `type ValueMap<F extends Record<string, FieldType<any>>> = …` | `ValueMap` needs to accept an *heterogeneous* record where **each** field can be a `FieldType<T>` for *its own, unique* `T`.  TS does not have existential / higher-kinded generics ("there exists a `T`").  Replacing `any` with a concrete super-type (`FieldType<Typeable>`/`unknown`/etc.) fails because `FieldType<T>` is *invariant* (the `is` function parameter makes it so).  Consequently `FieldType<string>` is **not** assignable to `FieldType<Typeable>`, breaking every call-site. |
|   78 | `type InputValueMap<F extends Record<string, FieldType<any>>> = …`<br>and<br>`F[K] extends { default: any }` | Same heterogeneity problem as above.  The conditional check merely differentiates “has default” vs “no default” – changing `any` to `unknown` here compiles, but the surrounding `FieldType<any>` cannot be tightened for the reason above, so the overall `any` usage remains. |
|  106 | `export class Schema<F extends Record<string, FieldType<any>>>` | `Schema` must accept the same heterogeneous map discussed earlier; the invariant-generic issue applies identically. |
|  125 | `const def = (fieldDef as FieldType<any>).default;` | At runtime `fieldDef` is a union of *all* possible `FieldType<T>` instantiations.  A safe way to access `.default` across that union is to cast to `FieldType<any>`.  Without the cast TS produces an error (`.default` does not exist on the union). |
|  166 | `static from<F extends Record<string, FieldType<any>>>(schema: F)` | Propagates the same heterogeneous-map constraint into the helper factory. |
|  189 | `static tryNew<I extends Record<string, any>>(…)` (and the two following uses) | `tryNew` intentionally accepts **any** object that matches the *values* of the schema (`ValueMap<F>`).  Constraining the record’s values to `Typeable` is insufficient because callers are allowed to pass union-typed primitives (e.g. `"ok" | number`) and we cannot express “the union of every `V` inside `ValueMap<F>`” without access to `F` in this static context.  Using `unknown` or `Typeable` breaks downstream inference. |

### Attempted approaches and their outcomes

1. **Replace `FieldType<any>` with `FieldType<Typeable>`**  
   Fails because `FieldType` is invariant – the `is?: (val: T) ⇒ …` property is
   contravariant in its parameter.  Concrete example:

   ```ts
   // Not assignable – compile error
   const x: FieldType<Typeable> = Of<string>();
   ```

2. **Introduce a non-generic super-interface for `FieldType`**  
   Any version that widens the type of `is` to accept `unknown` (or removes it)
   loses type-safety and still isn’t a valid super-type because of function
   parameter variance.

3. **Union-based workaround (`FieldType<string> | FieldType<number> | …`)**  
   Explodes combinatorially and doesn’t scale once custom literal unions are
   introduced (`"ok" | "warn" | …`).

4. **Higher-kinded-types simulation with helper mapped types**  
   TS currently cannot abstract over the type argument of a generic inside a
   mapped type (`F extends { [K in string]: FieldType<infer T> }` is illegal),
   so this avenue is closed.

## Conclusion

All remaining `any`s serve as an *existential* placeholder – “there exists some
`T` that satisfies the `FieldType` contract, but we don’t care which one” – a
feature TypeScript lacks today.  Until the language gains proper
higher-kinded/​existential generics, these specific occurrences cannot be
eliminated without either:

- Breaking the ergonomic
  `Schema.from({ id: Of<string>(), age: Of<number>() })` API, **or**
- Resorting to overly complex workarounds that still reduce type-safety.

The two occurrences inside the conditional type (`{ default: any }`) *could*
be replaced with `unknown`, but doing so alone does not satisfy the issue’s
objective of removing *all* `any`s, and leaves the fundamental blockers in
place.

---

### Recommendation

Keep the current `any` usages and the top-file ESLint suppression as they are
intentional and currently the only practical solution.  Re-evaluate once
(TypeScript 💖) ships existential / higher-kinded generics.
