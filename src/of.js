/* -------------------------------------------------------------------------- */
/* Generic-only `Of` field builder                                             */
/* -------------------------------------------------------------------------- */
// Implementation ----------------------------------------------------------------
export function Of(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
opts) {
    // Interpret the `[]` sentinel as an empty options object for ergonomics.
    const normalized = Array.isArray(opts) ? {} : opts;
    // Construct the skeleton descriptor.  The phantom `__t` and `value`
    // properties exist *solely* for the type-system – they carry no runtime data.
    const field = {
        __t: undefined,
        value: undefined,
    };
    // Shallow-copy the supplied options.  This is safe because callers can only
    // pass recognised keys thanks to the overload signatures above.
    Object.assign(field, normalized);
    return field;
}
