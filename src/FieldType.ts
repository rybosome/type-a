export type Constructor<T> = new (...args: any[]) => T;

export interface FieldType<T> {
  type: string;
  runtimeTypeHint?: Constructor<T>;
}

export function Of<T>(type: string, runtimeTypeHint?: Constructor<T>): FieldType<T> {
  const field: FieldType<T> = { type };
  if (runtimeTypeHint) {
    field.runtimeTypeHint = runtimeTypeHint;
  }
  return field;
}
