type FieldType<T> = { value: T | undefined; default?: T | (() => T) };

type Of = <T>(x: { default: T }) => FieldType<T>;
const Of: Of = (x) => ({ value: undefined, ...x });

type ValueMap<F extends Record<string, FieldType<any>>> = {
  [K in keyof F]: F[K] extends FieldType<infer V> ? V : never;
};

type InputValueMap<F extends Record<string, FieldType<any>>> = {
  [K in keyof F as F[K] extends { default: any } ? never : K]: ValueMap<F>[K];
} & {
  [K in keyof F as F[K] extends { default: any } ? K : never]?: ValueMap<F>[K];
};

const schema = { flag: Of({ default: true }) };

type Input = InputValueMap<typeof schema>;

const ok: Input = {};
