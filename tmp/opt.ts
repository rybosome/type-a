type FieldType<T> = { value: T | undefined; default?: T };

type FieldWithDefault<T> = FieldType<T> & { default: T };

type FieldWithoutDefault<T> = Omit<FieldType<T>, 'default'> & { default?: undefined };

type SchemaFields = {
  name: FieldWithoutDefault<string | undefined>;
};

type ValueMap<F extends Record<string, FieldType<any>>> = { [K in keyof F]: F[K] extends FieldType<infer V> ? V : never };

type InputValueMap<F extends Record<string, FieldType<any>>> = {
  [K in keyof F as F[K] extends { default: any }
    ? never : undefined extends ValueMap<F>[K] ? never : K]: ValueMap<F>[K]
} & {
  [K in keyof F as F[K] extends { default: any }
    ? K : undefined extends ValueMap<F>[K] ? K : never]?: ValueMap<F>[K]
};

type Result = InputValueMap<SchemaFields>;
