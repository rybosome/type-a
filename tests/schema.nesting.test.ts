import { describe, it, expect } from "vitest";

import { Schema, Of, nonEmpty, atLeast, Nested } from "@rybosome/type-a";

/**
 * Tests for arbitrarily-nested schema support using the new generic-only
 * `Of<Nested<...>>()` API (no `schemaClass` duplication).
 */

describe("Schema nesting", () => {
  class Address extends Schema.from({
    firstLine: Of<string>({ is: nonEmpty }),
    secondLine: Of<string | undefined>(),
    city: Of<string>({ is: nonEmpty }),
    state: Of<string>({ is: nonEmpty }),
    zip: Of<number>({ is: atLeast(10000) }),
  }) {}

  class User extends Schema.from({
    name: Of<string>({ is: nonEmpty }),
    address: Of<Nested<typeof Address>>(),
  }) {}

  it("instantiates with nested schema instances and exposes nested fields", () => {
    const addr = new Address({
      firstLine: "123 Fake Street",
      city: "Cityville",
      state: "Nowhere",
      zip: 12345,
    });

    const u = new User({ name: "Jane Doe", address: addr });

    expect(u.address.city).toBe("Cityville");
    expect(u.address.zip).toBe(12345);
  });

  it("performs recursive validation when nested schema is invalid", () => {
    const badAddr = new Address({
      firstLine: "", // fails nonEmpty
      city: "", // fails nonEmpty
      state: "", // fails nonEmpty
      zip: 50, // fails atLeast(10000)
    });

    const bad = new User({ name: "Bob", address: badAddr });

    const errs = bad.validate();

    expect(errs).toContain("address.firstLine: must not be empty");
    expect(errs).toContain("address.city: must not be empty");
    expect(errs).toContain("address.state: must not be empty");
    expect(errs).toContain("address.zip: 50 is not atLeast(10000)");
  });

  it("supports deeply-nested structures", () => {
    class Company extends Schema.from({
      name: Of<string>({ is: nonEmpty }),
      hq: Of<Nested<typeof Address>>(),
    }) {}

    class Account extends Schema.from({
      owner: Of<Nested<typeof User>>(),
      employer: Of<Nested<typeof Company>>(),
    }) {}

    const acct = new Account({
      owner: new User({
        name: "Alice",
        address: new Address({
          firstLine: "456 Somewhere Ave",
          city: "Townsville",
          state: "TX",
          zip: 77777,
        }),
      }),
      employer: new Company({
        name: "ACME Corp",
        hq: new Address({
          firstLine: "1 Corporate Way",
          city: "Metropolis",
          state: "NY",
          zip: 10001,
        }),
      }),
    });

    expect(acct.owner.address.state).toBe("TX");
    expect(acct.employer.hq.city).toBe("Metropolis");
    expect(acct.validate()).toEqual([]);
  });
});
