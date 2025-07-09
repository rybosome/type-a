import { Schema, Of, one } from "./src/index";

class A extends Schema.from({ id: Of<one, string>({}) }) {}

function take<C extends new (...args: any[]) => any>(c: C) {}

take(A);
