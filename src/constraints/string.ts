import { LogicalConstraint } from "@src/types";

/**
 * Ensures a string has at least one character.
 */
export const nonEmpty: LogicalConstraint<string> = (val) =>
  val.length > 0 ? true : "must not be empty";

/**
 * RFC-4122 version-4 UUID validator.
 */
export const aUUID: LogicalConstraint<string> = (val) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val,
  )
    ? true
    : "Invalid UUID";
