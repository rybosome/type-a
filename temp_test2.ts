interface FieldType<T extends string|number|boolean> {
  value: T|undefined;
}

type Accept<F extends Record<string, FieldType<string|number|boolean>>> = F;

const obj = {
  status: { value: undefined } as FieldType<"ok" | number>,
};

const accepted: Accept<typeof obj> = obj;
