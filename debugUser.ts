import { Schema, Of, serdes } from "@rybosome/type-a";

const serializeDate = (d: Date) => d.toISOString();
const deserializeDate = (s: string) => new Date(s);

class User extends Schema.from({
  name: Of<string>(),
  created: Of<serdes<Date, string>>({
    serdes: [serializeDate, deserializeDate],
  }),
}) {}

const iso = "2025-01-02T03:04:05.000Z";

const u = new User({ name: "Alice", created: iso });

type CreatedType = typeof u.created;
// purposely cause error if not Date
let dt: Date;
dt = u.created;
