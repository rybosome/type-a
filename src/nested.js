/**
 * Internal symbol used to brand a *nested schema wrapper* value at runtime.
 * The wrapper object is never inspected directly by the core library – the
 * mere presence of the property is enough for the type-system to treat the
 * value as `nested<S>`.
 */
const _NESTED_BRAND = Symbol("type-a.nested.brand");
/**
 * Runtime helper that returns the branded wrapper and **registers** the schema
 * class for later reflective look-ups (currently this side-effect is a
 * no-op but reserved for future use).
 */
export function nested(schema) {
    // In the future we may populate a registry for faster look-ups. For now the
    // wrapper object itself is sufficient.
    return { [_NESTED_BRAND]: schema };
}
