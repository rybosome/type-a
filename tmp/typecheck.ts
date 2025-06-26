type Typeable = string | number | boolean | null | undefined;
interface FieldType<T extends Typeable> { value: T | undefined; default?: T };
type FieldWithoutDefault<T extends Typeable> = Omit<FieldType<T>, 'default'>;

type HasDefault<T> = T extends { default: any } ? true : false;

type A = HasDefault<FieldWithoutDefault<string>>;
const val: A = true;
