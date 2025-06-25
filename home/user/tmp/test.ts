export type Typeable = string | number | boolean | null | undefined;

export type LogicalConstraint<T extends Typeable> = (val: T) => true | string;

export interface FieldType<T extends Typeable> {
  value: T | undefined;
  default?: T | (() => T);
  is?: LogicalConstraint<NonNullable<T>>;
}

// Example constraint
const atLeast = (min: number): LogicalConstraint<number> => (val) => val >= min ? true : "bad";

const field: FieldType<number | undefined> = { value: 1, is: atLeast };
