import { Schema, Of } from '../src/schema';

class U extends Schema.from({
  active: Of<boolean>({ default: true }),
  id: Of<string>({}),
}) {}

type C = ConstructorParameters<typeof U>[0];
