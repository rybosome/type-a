import { LogicalConstraint } from "./schema";

export const nonEmpty: LogicalConstraint<string> = (val) =>
  val.length > 0 ? true : "must not be empty";

export const aUUID: LogicalConstraint<string> = (val) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val,
  )
    ? true
    : "Invalid UUID";

export const atLeast =
  (min: number): LogicalConstraint<number> =>
  (val) =>
    val >= min ? true : `${val} is not atLeast(${min})`;
