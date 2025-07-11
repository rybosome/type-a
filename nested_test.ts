import { Schema, one, typed as t } from "@rybosome/type-a";

class Address extends Schema.from({
  street: one(t.string),
  zip: one(t.string),
}) {}

class User extends Schema.from({
  name: one(t.string),
  address: one(Address),
}) {}

const u = new User({
  name: "Bob",
  address: { street: "42 Main St", zip: "12345" },
});

// type check
u.address.street;
