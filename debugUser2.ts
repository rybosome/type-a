import { Schema, Of, serdes } from "./src/index.js";

const serializeDate = (d: Date) => d.toISOString();
const deserializeDate = (s: string) => new Date(s);

class User extends Schema.from({
  name: Of<string>(),
  created: Of<serdes<Date, string>>({
    serdes: [serializeDate, deserializeDate],
  }),
}) {}

const u = new User({ name: "Alice", created: "2025-01-01T00:00:00.000Z" });
console.log(typeof u.created, u.created instanceof Date, u.created);
