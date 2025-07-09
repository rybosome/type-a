import { Schema, Of, one } from "./src/index";

class A extends Schema.from({
  id: Of<one, string>({})
}) {}

function acceptSchemaClass<T extends new (...args: any[]) => any>(C: T) {}
acceptSchemaClass(A);
