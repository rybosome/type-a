import { LogicalConstraint } from "../schema";

/**
 * val >= min
 */
export const atLeast =
  (min: number): LogicalConstraint<number> =>
  (val) =>
    val >= min ? true : `${val} is not atLeast(${min})`;

/**
 * val <= max
 */
export const atMost =
  (max: number): LogicalConstraint<number> =>
  (val) =>
    val <= max ? true : `${val} is not atMost(${max})`;

// Alias that reads a little nicer for some usages
export const noMoreThan = atMost;

/**
 * val > min
 */
export const greaterThan =
  (min: number): LogicalConstraint<number> =>
  (val) =>
    val > min ? true : `${val} is not greaterThan(${min})`;

/**
 * val < max
 */
export const lessThan =
  (max: number): LogicalConstraint<number> =>
  (val) =>
    val < max ? true : `${val} is not lessThan(${max})`;

/**
 * Inclusive/Exclusive range check.
 * If `inclusive` is true (default):  min ≤ val ≤ max
 * Otherwise:                          min <  val <  max
 */
export const between =
  (min: number, max: number, inclusive = true): LogicalConstraint<number> =>
  (val) => {
    const ok = inclusive ? val >= min && val <= max : val > min && val < max;
    return ok ? true : `${val} is not${inclusive ? "" : " strictly"} between(${min}, ${max})`;
  };

/** val > 0 */
export const positive: LogicalConstraint<number> = (val) =>
  val > 0 ? true : `${val} is not positive`;

/** val < 0 */
export const negative: LogicalConstraint<number> = (val) =>
  val < 0 ? true : `${val} is not negative`;

/** Integer check (no fractional component) */
export const isInteger: LogicalConstraint<number> = (val) =>
  Number.isInteger(val) ? true : `${val} is not an integer`;

// Backwards-compat alias
export const integer = isInteger;
