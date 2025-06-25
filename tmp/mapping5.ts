type FieldType<T> = { value: T | undefined; default?: T | (() => T) };

type ValueMap<F extends Record<string, FieldType<any>>> = {
  [K in keyof F]: F[K] extends FieldType<infer V> ? V : never;
};

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

type Model = { flag: FieldType<boolean> & { default: boolean } };

type Test = InputValueMap<Model>;
