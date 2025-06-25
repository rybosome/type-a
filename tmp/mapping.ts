type FieldType<T> = { value: T | undefined; default?: T | (() => T); };

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

type M = {
  a: FieldType<string>;
  b: FieldType<string> & { default: string };
  c: FieldType<string | undefined>;
};

type Test = InputValueMap<M>;
