# Design Spec — Compile-time enforcement of `is` for literal-union types in `Of<T>`

This document captures the **final design** for tightening `Of<T>` so that the
runtime–type validator (`is`) becomes **mandatory** whenever `T` is a _narrow
primitive union_ (aka “literal-union”).  It supersedes the exploratory notes
posted in issue #44 and incorporates the decisions recorded on **July 8, 2025**.

> **Status** · _Accepted_ — implementation tracked in
> [`ai-44-make-literal-runtime-behavior-intuitive`](https://github.com/rybosome/type-a/tree/ai-44-make-literal-runtime-behavior-intuitive)

---

## 1  Current shape of `Schema.from` and `Of<T>`

`Schema.from()` is a simple factory that stamps the supplied _fields object_
onto a generated subclass. It is **unaffected** by this proposal.

`Of<T>()` is presently declared through several overloads that all accept the
same _options_ object:

```ts
{
  // Optional in every overload today – key point
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];

  // Extras (optional) depending on overload
  default?: T | (() => T);
  serdes?: [(value: T) => R, (value: R) => T];
}
```

The optionality of `is` makes it legal to write:

```ts
state: Of<PostState>({ /* no is */ });
```

even when `PostState` is the literal union

```ts
type PostState = "draft" | "published" | "archived";
```

At runtime we **attempt** to infer a guard by source-code inspection, but that
heuristic can silently mis-validate. The goal is to move the guarantee _into
the type-system_ and make the behaviour explicit.

---

## 2  Type-level detection of “literal union” and conditional requirement of `is`

### 2.1 Terminology

* **Wide** primitive  — the canonical base type (`string`, `number`, `boolean`).
* **Narrow** primitive — a type that _extends_ one of those bases **without**
  containing the base itself – i.e. every constituent is a literal.

### 2.2 Utility types

```ts
/* Narrow-primitive detectors */
type NarrowString<T>  = T extends string  ? (string  extends T ? never : T) : never;
type NarrowNumber<T>  = T extends number  ? (number  extends T ? never : T) : never;
type NarrowBoolean<T> = T extends boolean ? (boolean extends T ? never : T) : never;

/* Does T contain *only* literal primitives? */
type IsLiteralPrimitiveUnion<T> =
  | NarrowString<T>
  | NarrowNumber<T>
  | NarrowBoolean<T> extends never
      ? false
      : true;
```

```ts
IsLiteralPrimitiveUnion<"a" | "b">   // true
IsLiteralPrimitiveUnion<string>        // false
IsLiteralPrimitiveUnion<42 | number>   // false
```

### 2.3 Conditional option shape

```ts
type IsKey<T> =
  IsLiteralPrimitiveUnion<T> extends true
    ? { // literal union – must supply
        is: LogicalConstraint<NonNullable<T>> |
            LogicalConstraint<NonNullable<T>>[];
      }
    : { // wide type – still optional
        is?: LogicalConstraint<NonNullable<T>> |
             LogicalConstraint<NonNullable<T>>[];
      };
```

### 2.4 Refactored overload pattern

Every existing `Of<T>` overload becomes:

```ts
export function Of<T extends Typeable, R = T>(
  opts?: (BaseOpts<T, R> & IsKey<T>)
): FieldType<T, R>;
```

where `BaseOpts<T, R>` captures the remainder of the option properties
(`default`, `serdes`, …).  The call-site experience:

```ts
Of<PostState>({});            // 🟥 compile-time error – missing `is`
Of<PostState>({ is: … });     // ✅ OK
Of<string>({});               // ✅ OK (wide type)
```

Nested-schema overloads (`Of(SchemaClass)`) are unchanged; they never accept
an `is` property.

---

## 3  Helper: `aLiteral<T>()`

```ts
/**
* Build a runtime guard for a literal primitive union.
*
*   state: Of<PostState>({ is: aLiteral<PostState>() }),
*/
export function aLiteral<T extends string | number | boolean>(): (
  val: T
) => true | `${T} is not one of ${string}`;
```

`aLiteral<T>()` uses the same **heuristic guard-generator** that currently
lives inside `Of<T>`. No code-generation or build-time transform is planned.

---

## 4  Backward compatibility & migration

1. **Wide primitives / objects / nested schemas** ▶︎ _no change_.
2. **Existing literal-union fields without an `is`** ▶︎ fail to compile.
   *Migration*: import `aLiteral` and supply it:

   ```ts
   import { aLiteral } from "@rybosome/type-a";

   state: Of<PostState>({ is: aLiteral<PostState>() }),
   ```

3. Implementation is **type-only**; emitted JS remains unchanged except that
   `Of<T>` no longer runs the implicit guard-generator path.

---

## 5  Edge cases & limitations (final)

| Case | Behaviour | Rationale |
|------|-----------|-----------|
| **Single literal** – e.g. `"only"` | `is` **required** | Still a narrow type. |
| **Mixed literal kinds** – e.g. `"a" \| 1` | `is` **required** | Detected via composite of string/number checks. |
| **Union that also contains the wide type** – e.g. `"a" \| string` | Treated as **wide** ➝ `is` **optional** | `string extends T` evaluates to `true`, so type isn’t narrow. Docs _discourage_ this because runtime guard becomes impossible. |
| **Template-literal types** – e.g. <code>`user-${number}`</code> | Out of scope ➝ `is` **optional** | Complex to detect; can be revisited later. |
| **Non-primitive literals** – e.g. `123n` (`bigint`) | Out of scope ➝ `is` **optional** | `bigint` support deferred. |
| **Nested schema overload** | Unchanged | `is` not part of its signature. |

---

## 6  Resolved questions

| Topic | Decision |
|-------|----------|
| **Error messaging** | The compile-time _missing-`is`_ diagnostic must include: _“Tip: use `aLiteral<T>()` to generate a validator automatically.”_  This shows up in the IDE tooltip / TS error details. |
| **Runtime guard generator** | **No new code-generation step.** `aLiteral<T>()` simply wraps the existing heuristic from the current `Of<T>` implementation. |

---

## 7  Open items

None.  Any further clarifications can be appended as follow-up RFCs if real-world
usage uncovers additional edge cases.
