/* eslint-disable @typescript-eslint/no-explicit-any */
/* -------------------------------------------------------------------------- */
/* `with()` helper – nested-schema aware field builder                         */
/* -------------------------------------------------------------------------- */
import { Of } from "@src/of";
/* -------------------------------------------------------------------------- */
/* Public builder                                                             */
/* -------------------------------------------------------------------------- */
export function has(schemaClass) {
    // The object we return contains a single `Of` method.  We *narrow* the type
    // of that method using an explicit cast so that callers see the conditional
    // constraint linking `T` to `nested<S>`.
    function OfWithinHas(opts) {
        // Delegate the heavy lifting to the generic-only `Of` builder.
        const field = Of(opts);
        // Attach runtime metadata so that nested instantiation and relationship
        // helpers work as before.  We *cannot* know the concrete value of `C`
        // (generic is erased), so we emit it as `undefined as unknown as C` – the
        // property still exists at runtime but consumers must not rely on its
        // value until we devise a more robust strategy.
        field.schemaClass = schemaClass;
        field.cardinality = undefined;
        return field;
    }
    return {
        // Cast with conditional to *statically* enforce that the caller’s `T`
        // matches `nested<S>` (optionally an array and/or undefined).
        Of: OfWithinHas,
    };
}
// Re-export with the concise name requested by the design doc.
export { has as with };
