import { describe, it, expect } from "vitest";

import {
  Schema,
  Of,
  has,
  one,
  many,
  nested,
  nonEmpty,
  atLeast,
} from "@rybosome/type-a";

/**
 * Tests for arbitrarily-nested schema support.
 */

describe("Schema nesting", () => {
  class Address extends Schema.from({
    firstLine: Of<one, string>({ is: nonEmpty }),
    secondLine: Of<one, string | undefined>({}),
    city: Of<one, string>({ is: nonEmpty }),
    state: Of<one, string>({ is: nonEmpty }),
    zip: Of<one, number>({ is: atLeast(10000) }),
  }) {}

  class User extends Schema.from({
    name: Of<one, string>({ is: nonEmpty }),
    address: has(Address).Of<one, nested<Address>>({}),
  }) {}

  it("instantiates with nested object and exposes nested fields", () => {
    // `address` is a generic record
    const u1 = new User({
      name: "Jane Doe",
      address: {
        firstLine: "123 Fake Street",
        city: "Cityville",
        state: "Nowhere",
        zip: 12345,
      },
    });

    // `address` is a schema instance
    const u2 = new User({
      name: "Jane Doe",
      address: new Address({
        firstLine: "123 Fake Street",
        city: "Cityville",
        state: "Nowhere",
        zip: 12345,
      }),
    });

    for (const u of [u1, u2]) {
      expect(u.address.city).toBe("Cityville");
      expect(u.address.zip).toBe(12345);
    }
  });

  it("performs recursive validation", () => {
    const bad = new User({
      name: "Bob",
      address: {
        firstLine: "", // fails nonEmpty
        city: "", // fails nonEmpty
        state: "", // fails nonEmpty
        zip: 50, // fails atLeast(10000)
      },
    });

    const errs = bad.validate();

    expect(errs).toContain("address.firstLine: must not be empty");
    expect(errs).toContain("address.city: must not be empty");
    expect(errs).toContain("address.state: must not be empty");
    expect(errs).toContain("address.zip: 50 is not atLeast(10000)");
  });

  it("supports deeply-nested structures", () => {
    class Company extends Schema.from({
      name: Of<one, string>({ is: nonEmpty }),
      hq: has(Address).Of<one, nested<Address>>({}),
    }) {}

    class Account extends Schema.from({
      owner: has(User).Of<one, nested<User>>({}),
      employer: has(Company).Of<one, nested<Company>>({}),
    }) {}

    const acct = new Account({
      owner: {
        name: "Alice",
        address: {
          firstLine: "456 Somewhere Ave",
          city: "Townsville",
          state: "TX",
          zip: 77777,
        },
      },
      employer: {
        name: "ACME Corp",
        hq: {
          firstLine: "1 Corporate Way",
          city: "Metropolis",
          state: "NY",
          zip: 10001,
        },
      },
    });

    expect(acct.owner.address.state).toBe("TX");
    expect(acct.employer.hq.city).toBe("Metropolis");
    expect(acct.validate()).toEqual([]);
  });

  it("supports type-composition", () => {
    class Company extends Schema.from({
      name: Of<one, string>({ is: nonEmpty }),
    }) {}

    class WorkHistory extends Schema.from({
      employers: has(Company).Of<many, nested<Company>[]>({}),
    }) {}

    new WorkHistory({
      employers: [{ name: "ACME Corp " }, { name: "Banana Factory" }],
    });
  });
});
