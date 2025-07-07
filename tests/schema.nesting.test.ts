import { describe, it, expect } from "vitest";

import { Schema, Of, nonEmpty, atLeast } from "@rybosome/type-a";

/**
 * Tests for arbitrarily-nested schema support.
 */

describe("Schema – nesting", () => {
  /* ------------------------------------------------------------------ */
  /* Single-level nesting                                               */
  /* ------------------------------------------------------------------ */
  class Address extends Schema.from({
    firstLine: Of<string>({ is: nonEmpty }),
    secondLine: Of<string | undefined>(), // optional line
    city: Of<string>({ is: nonEmpty }),
    state: Of<string>({ is: nonEmpty }),
    zip: Of<number>({ is: atLeast(10000) }),
  }) {}

  class User extends Schema.from({
    name: Of<string>({ is: nonEmpty }),
    address: Of(Address),
  }) {}

  it("instantiates with nested object and exposes nested fields", () => {
    const u = new User({
      name: "Jane Doe",
      address: {
        firstLine: "123 Fake Street",
        city: "Cityville",
        state: "Nowhere",
        zip: 12345,
      },
    });

    // Outer fields
    expect(u.name).toBe("Jane Doe");

    // Nested instance should be present and typed
    expect(u.address.city).toBe("Cityville");
    expect(u.address.zip).toBe(12345);
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

  /* ------------------------------------------------------------------ */
  /* Deep nesting (2+ levels)                                           */
  /* ------------------------------------------------------------------ */
  class Company extends Schema.from({
    name: Of<string>({ is: nonEmpty }),
    hq: Of(Address),
  }) {}

  class Account extends Schema.from({
    // Use the **class** overload of `Of` so the nested value can be provided
    // either as a raw object *or* an already-constructed `User` instance.
    //
    // The generic (`Of<User>()`) variant is intentionally **not** used here
    // because it describes a *plain object field* whose value must already be
    // a `User` instance. That variant is useful when you genuinely want to
    // store an existing model, but for nested-schema construction we need the
    // special overload that injects the `schemaClass` sentinel so the Schema
    // constructor knows to recurse.
    owner: Of(User),
    employer: Of(Company),
  }) {}

  it("supports deeply-nested structures", () => {
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
});
