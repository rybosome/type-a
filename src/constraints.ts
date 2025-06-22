import { LogicalConstraint } from './base-model';

export const isUUID: LogicalConstraint<string> = (val) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)
    ? true
    : "Invalid UUID";

export const Min = (min: number): LogicalConstraint<number> => (val) =>
  val >= min ? true : `Must be >= ${min}`;
