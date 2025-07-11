# API v3 Migration – Phase A Code-map

Generated **Jul 10 2025** from branch `ai-71-v3-impl` (based on `ai-71-api-v3-design-spike`).

This document is a _read-only inventory_ of the current codebase. It points at every spot that will have to move (or _not move_) when we flip the public API from generic-only helpers to the new **runtime-value `t.*` descriptors**.

> 📖 Headings are grouped exactly by the tasks listed in the Phase A checklist so that each section can be checked-off individually.

---

## 1 · Public helpers exported by `src/index.ts`

The entry file is intentionally tiny – it re-exports the real helpers from sub-modules, so we must chase each `export * from …` to find the _effective_ public surface:

```ts
// src/index.ts
export * from "./constraints"; // 🏷️ validators (string & numeric)
export * from "./schema"; // 🏗️ Schema class + static helpers
export * from "./field"; // 🧰 one() / many() builders + FieldOpts
export * from "./types"; // 📐 public utility/types (FieldType, Serdes…)
// Conditional helpers
export * from "./conditionals/utils"; // 🎯 aLiteral()
```

### 1.1 High-level builder & class helpers

- **`Schema`** (class) – `src/schema.ts`
- **`one()`** field builder – `src/field.ts`
- **`many()`** field builder – `src/field.ts`
- **`FieldOpts<T,R>`** (interface) – `src/field.ts`

### 1.2 Constraint helpers (runtime validators)

From `src/constraints/string.ts`:

- `nonEmpty`, `notEmpty`, `empty`, `whitespace`
- `equalTo`, `notEqualTo`
- `longerThan`, `shorterThan`, `minLength`, `maxLength`, `length`, `lengthBetween`
- `validAscii`, `alphanumeric`, `alpha`, `numeric`, `hex`, `base64`
- `aUUID` (alias `uuid`)
- `matching`, `startingWith`, `endingWith`, `containing`, `notContaining`
- `slug`, `email`, `url`, `domain`

From `src/constraints/numeric.ts`:

- `atLeast`, `atMost` (alias `noMoreThan`)
- `greaterThan`, `lessThan`, `between`
- `positive`, `negative`, `isInteger` (alias `integer`)

### 1.3 Conditional / literal helper

- **`aLiteral(…values)`** – `src/conditionals/utils.ts`

### 1.4 Utility types (re-exported for users)

- `Typeable`, `FieldType`, `Serdes`, `LogicalConstraint` … (full list lives in `src/types.ts`). These are _types only_ and mostly unaffected by the v3 runtime descriptor work.

---

## 2 · Generic-only marker usages – `__t`

The phantom `__t` property is the _tell_ that the existing implementation relies on **generic-only knowledge**. Every write/read must be replaced or removed when we introduce `spec: TypedSpec`.

| File            | Line                                                                                                              | Code excerpt                                        | Purpose                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/field.ts`  | [`45-48`](https://github.com/rybosome/type-a/blob/d78839dec586e0721d8955756ceaf10b760e41f9/src/field.ts#L45-L48)  | `__t: undefined as unknown as T`                    | Sets phantom on every new `FieldType` instance.                                           |
| `src/types.ts`  | [`178`](https://github.com/rybosome/type-a/blob/d78839dec586e0721d8955756ceaf10b760e41f9/src/types.ts#L178)       | `readonly __t: T;`                                  | Compile-time preservation in `FieldType<T>`.                                              |
| `src/schema.ts` | [`89-96`](https://github.com/rybosome/type-a/blob/d78839dec586e0721d8955756ceaf10b760e41f9/src/schema.ts#L89-L96) | `if (!fieldDef.schemaClass && "__t" in fieldDef)` … | _Heuristic_ that infers `schemaClass` for nested schemas by inspecting the phantom value. |

No tests or utilities read `__t` directly – the schema constructor is the single runtime consumer.

Implication for v3 → **`__t` disappears completely** (replaced by concrete `spec.kind` metadata). Any logic piggy-backing on it (notably the nested-schema heuristic) must be rewritten to consult the descriptor instead.

---

## 3 · Conversion patterns to track

### 3.1 `FieldType<T>` guards using `typeof` checks

The hard-coded _primitive_ validators live in `src/schema.ts`:

```ts
const DEFAULT_VALIDATORS = {
  boolean: (v) => (typeof v === "boolean" ? true : "expected boolean"),
  number: (v) =>
    typeof v === "number" && Number.isFinite(v)
      ? true
      : "expected finite number",
  string: (v) => (typeof v === "string" ? true : "expected string"),
  array: (v) => (Array.isArray(v) ? true : "expected array"),
  object: (v) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? true
      : "expected plain object",
};
```

They are _runtime_ only — their compile-time knowledge comes from the generic parameter of `FieldType`. In v3 the decision will instead be delegated by a **`switch (spec.kind)`**. The validator functions themselves are reusable **as-is**.

### 3.2 Generic overload “funnels” (`one().of<…>`, `many().of<…>`)

`src/field.ts` implements layered overloads that ultimately call `makeField(opts, schemaClass)`. The generics collapse there; at runtime nothing remains. Every call-site will move to:

```ts
one(t.string, opts); // no nested schema
one(User, opts); // nested schema (SchemaClass is still allowed)
many(t.number, opts); // arrays / sets handled identically
```

Meaning:

- **All overload signatures will be deleted**.
- The _single_ new signature accepts either `SchemaClass` **or** `TypedSpec`.
- Type inference will rely on helper types (`ValueOfSpec`, `RawOfSpec`) rather than the generic parameter.

### 3.3 Over-the-wire collection helpers

`asIterable(v)` in `src/schema.ts` unifies `Array` vs `Set` handling. It is generic enough to survive intact (implementation merely inspects instances).

---

## 4 · Thin wrappers safe to preserve unchanged

- **`composeConstraints()`** – detector/aggregator for logical constraints (src/schema.ts).
- **`DEFAULT_VALIDATORS`** literal — can be hoisted unchanged under the new `primitive` spec-kind.
- **`asIterable()`** — generic runtime helper, independent of the generic hack.
- **Set / Array overload _implementation_ inside `many()`** — still needed; only the _types_ around it change.

---

## 5 · Entry points expected _not_ to change

- **Constraints module** (`src/constraints/**`) — pure validators, unaffected.
- **`aLiteral()`** helper (`src/conditionals/utils.ts`) — remains valuable for enums & literal unions.
- **`scripts/docs-test.ts` harness** — only _paths_ will change (docs examples) but the harness logic is agnostic to the API internals.
- **Docs under `docs/`** themselves — rewritten later, but _test_ harness can stay.

---

## 6 · Checklist punch-card

- [x] Branch `ai-71-v3-impl` created off design spike branch.
- [x] All public helpers enumerated.
- [x] `__t` usages located and documented.
- [x] Conversion patterns noted (validators, builder funnels).
- [x] Thin wrappers identified for direct reuse.
- [x] No-change entry points catalogued.

<br>

➡️ **Phase A deliverable complete. Ready for review and for Phase B implementation work.**
