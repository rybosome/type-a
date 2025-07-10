/**
 * Focused JSON serialization tests ensuring BigInt values are coerced to
 * strings so `JSON.stringify` does not throw – **v3 runtime**.
 */

import { describe, it, expect } from "vitest";

import { Schema } from "../../src/v3/schema";
import { one } from "../../src/v3/field";
import { t } from "../../src/v3/typed";

class BigIntModel extends Schema.from({
  qty: one(t.bigint),
}) {}

describe("v3 JSON serialization", () => {
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
