/**
 * Focused tests for JSON serialization, ensuring BigInt values are safely
 * converted so that `JSON.stringify()` does not throw.
 */

import { describe, it, expect } from "vitest";
import { Schema, Of, one } from "@rybosome/type-a";

describe("JSON serialization", () => {
  class BigIntModel extends Schema.from({
    qty: Of<one, bigint>({}),
  }) {}

  it("serializes a normal BigInt to a JSON string", () => {
    const m = new BigIntModel({ qty: 42n });

    // When `JSON.stringify` is invoked, `Schema#toJSON()` is automatically
    // called. The BigInt value should be coerced to its string form so that
    // no TypeError is thrown.
    const json = JSON.stringify(m);
    expect(json).toBe('{"qty":"42"}');
  });

  it("serializes very large and negative BigInt values", () => {
    const veryLarge = 123456789012345678901234567890123456789n;
    const negative = -999999999999999999999999999999999999n;

    const largeModel = new BigIntModel({ qty: veryLarge });
    const negativeModel = new BigIntModel({ qty: negative });

    // Ensure no exceptions are thrown and the output matches the expected
    // stringified representation.
    expect(JSON.stringify(largeModel)).toBe(
      '{"qty":"' + veryLarge.toString() + '"}',
    );
    expect(JSON.stringify(negativeModel)).toBe(
      '{"qty":"' + negative.toString() + '"}',
    );
  });
});
