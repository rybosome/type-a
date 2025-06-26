type Typeable = string | number | boolean | null | undefined;

interface FieldType<T extends Typeable> {
  value: T | undefined;
  default?: T;
  is?: (val: NonNullable<T>) => true | string;
}

type FieldWithDefault<T extends Typeable> = FieldType<T> & { default: T };

type FieldWithoutDefault<T extends Typeable> = Omit<FieldType<T>, 'default'>;

type SchemaFields = {
  name: FieldWithoutDefault<string | undefined>;
  enabled: FieldWithDefault<boolean>;
};

type ValueMap<F extends Record<string, FieldType<any>>> = { [K in keyof F]: F[K] extends FieldType<infer V> ? V : never };

type InputValueMap<F extends Record<string, FieldType<any>>> = {
  [K in keyof F as F[K] extends { default: any }
    ? never
    : undefined extends ValueMap<F>[K]
      ? never
      : K]: ValueMap<F>[K];
} & {
  [K in keyof F as F[K] extends { default: any }
    ? K
    : undefined extends ValueMap<F>[K]
      ? K
      : never]?: ValueMap<F>[K];
};

type Input = InputValueMap<SchemaFields>;

const ok0: Input = { name: undefined, enabled: true };
 const ok1: Input = { enabled: true };
 const ok2: Input = { name: "hi" };//should error enabled missing
