interface FieldType<T extends string|number|boolean> {
    value: T|undefined;
}

const f1: FieldType<string|number|boolean> = {value: undefined};
const f2: FieldType<"ok" | number> = f1; // Should error
