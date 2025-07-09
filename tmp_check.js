import { Schema, Of } from "./src/index";
class A extends Schema.from({ id: Of({}) }) {
}
function take(c) { }
take(A);
