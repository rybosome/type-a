import { Schema, Of } from "./src/index";
class A extends Schema.from({
    id: Of({})
}) {
}
function acceptSchemaClass(C) { }
acceptSchemaClass(A);
