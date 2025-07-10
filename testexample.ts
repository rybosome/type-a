import { Schema, one, many } from "./src/index";

class Item extends Schema.from({ id: one().of<number>({}) }) {}
class Wrapper extends Schema.from({ items: many(Item).of<Set<Item>>({}) }) {}

const w = new Wrapper({ items: new Set([{ id: 1 }, { id: 2 }]) });
console.log(w.items instanceof Set);
