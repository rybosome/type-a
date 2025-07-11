/**
 * Focused JSON serialization tests ensuring BigInt values are coerced to
 * strings so `JSON.stringify` does not throw.
 */

import { describe, it, expect } from "vitest";
import { Schema, one, typing as t } from "@rybosome/type-a";

class BigIntModel extends Schema.from({
  qty: one(t.bigint),
}) {}

describe("JSON serialization", () => {
  it("serializes a normal BigInt to a JSON string", () => {
    const m = new BigIntModel({ qty: 42n });
    expect(JSON.stringify(m)).toBe('{"qty":"42"}');
  });

  it("serializes very large and negative BigInt values", () => {
    const veryLarge = 123456789012345678901234567890123456789n;
    const negative = -999999999999999999999999999999999999n;

    const largeModel = new BigIntModel({ qty: veryLarge });
    const negativeModel = new BigIntModel({ qty: negative });

    expect(JSON.stringify(largeModel)).toBe(
      '{"qty":"' + veryLarge.toString() + '"}',
    );
    expect(JSON.stringify(negativeModel)).toBe(
      '{"qty":"' + negative.toString() + '"}',
    );
  });
});
