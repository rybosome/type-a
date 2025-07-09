/* -------------------------------------------------------------------------- */
/*  Numeric comparison helpers                                                */
/* -------------------------------------------------------------------------- */
/**
 * Ensures `val ≥ min`.
 *
 * String inputs are **not** supported – use {@link minLength} instead.
 */
export const atLeast = (min) => (val) => val >= min ? true : `${val} is not atLeast(${min})`;
/**
 * Ensures `val ≤ max`.
 *
 * String inputs are **not** supported – use {@link maxLength} instead.
 */
export const atMost = (max) => (val) => val <= max ? true : `${val} is not atMost(${max})`;
/** Alias that reads a little nicer for some usages */
export const noMoreThan = atMost;
/* -------------------------------------------------------------------------- */
/*  Pure numeric helpers                                                      */
/* -------------------------------------------------------------------------- */
/** val > min */
export const greaterThan = (min) => (val) => val > min ? true : `${val} is not greaterThan(${min})`;
/** val < max */
export const lessThan = (max) => (val) => val < max ? true : `${val} is not lessThan(${max})`;
/**
 * Inclusive/Exclusive range check.
 * If `inclusive` is true (default):  min ≤ val ≤ max
 * Otherwise:                          min <  val <  max
 */
export const between = (min, max, inclusive = true) => (val) => {
    const ok = inclusive ? val >= min && val <= max : val > min && val < max;
    return ok
        ? true
        : `${val} is not${inclusive ? "" : " strictly"} between(${min}, ${max})`;
};
/** val > 0 */
export const positive = (val) => val > 0 ? true : `${val} is not positive`;
/** val < 0 */
export const negative = (val) => val < 0 ? true : `${val} is not negative`;
/** Integer check (no fractional component) */
export const isInteger = (val) => Number.isInteger(val) ? true : `${val} is not an integer`;
/* Backwards-compat alias */
export const integer = isInteger;
