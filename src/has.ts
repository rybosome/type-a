/* eslint-disable @typescript-eslint/no-explicit-any */
/* -------------------------------------------------------------------------- */
/* `with()` helper – nested-schema aware field builder                         */
/* -------------------------------------------------------------------------- */

import { Of, type FieldOpts } from "@src/of";
import type { Cardinality, one, many } from "@src/cardinality";
import type { FieldType } from "@src/schema";
import type { SchemaClass } from "@src/schema";
import type { nested } from "@src/nested";
import type { Typeable } from "@src/types";

/* -------------------------------------------------------------------------- */
/* Helper utilities copied from `of.ts`                                        */
/* -------------------------------------------------------------------------- */

// We re-declare the internal helpers from `of.ts` to avoid a circular import.
type UnwrapNested<T> = T extends nested<infer S> ? InstanceType<S> : T;

type FieldValue<C extends Cardinality, T> = C extends typeof one
  ? UnwrapNested<T>
  : C extends typeof many
    ? UnwrapNested<T>[]
    : never;

/* -------------------------------------------------------------------------- */
/* Public builder                                                             */
/* -------------------------------------------------------------------------- */

export function has<S extends SchemaClass>(schemaClass: S) {
  // The object we return contains a single `Of` method.  We *narrow* the type
  // of that method using an explicit cast so that callers see the conditional
  // constraint linking `T` to `nested<S>`.

  function OfWithinHas<C extends Cardinality, T extends Typeable>(
    opts: FieldOpts<C, T>,
  ): any {
    // Delegate the heavy lifting to the generic-only `Of` builder.
    const field = Of<C, T>(opts) as FieldType<FieldValue<C, T>> & {
      schemaClass: S;
      cardinality: C;
    };

    // Attach runtime metadata so that nested instantiation and relationship
    // helpers work as before.  We *cannot* know the concrete value of `C`
    // (generic is erased), so we emit it as `undefined as unknown as C` – the
    // property still exists at runtime but consumers must not rely on its
    // value until we devise a more robust strategy.
    (field as any).schemaClass = schemaClass;
    (field as any).cardinality = undefined as unknown as C;

    return field;
  }

  return {
    // Cast with conditional to *statically* enforce that the caller’s `T`
    // matches `nested<S>` (optionally an array and/or undefined).
    Of: OfWithinHas as {
      <C extends Cardinality, T>(
        opts: FieldOpts<C, T>,
      ): T extends nested<S>[] | nested<S> | undefined
        ? FieldType<FieldValue<C, T>> & { schemaClass: S; cardinality: C }
        : never;
    },
  } as {
    Of: {
      <C extends Cardinality, T>(
        opts: FieldOpts<C, T>,
      ): T extends nested<S>[] | nested<S> | undefined
        ? FieldType<FieldValue<C, T>> & { schemaClass: S; cardinality: C }
        : never;
    };
  };
}

// Re-export with the concise name requested by the design doc.
export { has as with };
