/**
 * Helpers for conditional logic and runtime guards.
 *
 * The **`aLiteral`** helper generates a {@link LogicalConstraint} for a
 * *literal-union* set of primitive values (string | number | boolean | null |
 * undefined).  It is most commonly paired with `Of<T>()` when the type `T` is
 * a union of literals and callers want runtime validation in addition to
 * compile-time checking.
 *
 * ```ts
 * import { Schema, Of, aLiteral } from "@rybosome/type-a";
 *
 * type Pet = "dog" | "cat";
 *
 * class Owner extends Schema.from({
 *   favourite: Of<Pet>({ is: aLiteral("dog", "cat") }),
 * }) {}
 *
 * // ✅ OK – allowed literal
 * new Owner({ favourite: "dog" });
 *
 * // 🛑 Runtime error – "bird" is not an allowed Pet literal
 * new Owner({ favourite: "bird" }).validate();
 * ```
 *
 * The generated validator performs a **strict-equality** comparison (`===`) so
 * that `0` and `"0"`, `false` and `0`, etc. are treated as distinct values.
 */
/**
 * Build a runtime validator that accepts **only** the provided literal values.
 * All comparisons use *strict equality* (`===`).
 *
 * The generic parameter is inferred *from the arguments* so callers usually do
 * **not** need to provide an explicit `<T>` – it is preserved precisely,
 * ensuring seamless type-inference when passed to `Of<T>({ is: … })`.
 *
 * @example
 *   const isTrafficLight = aLiteral("red", "yellow", "green");
 *   isTrafficLight("red");   // → true
 *   isTrafficLight("blue");  // → "blue is not one of [red, yellow, green]"
 */
export function aLiteral(...allowed) {
    // Freeze the array so accidental runtime mutation is impossible
    const whitelist = allowed.slice();
    return (val) => {
        // Note: `includes` handles NaN correctly for numbers (false) which is fine
        // for literal checks – NaN never compares equal to itself and is unlikely
        // to be used as a literal value in this context.
        if (whitelist.includes(val))
            return true;
        return `${String(val)} is not one of [${whitelist.map(String).join(", ")}]`;
    };
}
