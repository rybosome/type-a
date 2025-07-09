/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  FieldType,
  LogicalConstraint,
  Nested,
  SchemaClass,
  Typeable,
} from "@src/types";

/**
 * Options object accepted by {@link one} / {@link many} builders.
 * This mirrors the legacy `Of()` helper so that **all** previous capabilities
 * (defaults, validators, custom serdes, variant unions) remain available under
 * the new API.
 */
export interface FieldOpts<T extends Typeable, R = T> {
  /** Optional default value or thunk returning the value. */
  default?: T | (() => T);

  /** Runtime validator (or array of validators). */
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];

  /**
   * Custom serialisation / deserialisation tuple.
   * `[raw -> in-memory, in-memory -> raw]`
   */
  serdes?: [(raw: R) => T, (val: T) => R] | [(val: T) => R, (raw: R) => T];

  /**
   * Explicit discriminated-union support. When provided **Type-A** will pick the
   * correct constructor at runtime based on either the `kind` discriminator or
   * the field-overlap heuristic (see implementation in `schema.ts`).
   */
  variantClasses?: SchemaClass[];
}

/* -------------------------------------------------------------------------- */
/* Internal helper                                                           */
/* -------------------------------------------------------------------------- */

function makeField<T extends Typeable>(
  opts: FieldOpts<T, any>,
  schemaClass?: SchemaClass,
): FieldType<T> {
  const field = {
    __t: undefined as unknown as T,
    value: undefined as unknown as T,
  } as FieldType<T>;

  if (schemaClass) (field as any).schemaClass = schemaClass;
  if (opts.default !== undefined) (field as any).default = opts.default;
  if (opts.is) (field as any).is = opts.is;
  if ((opts as any).serdes) (field as any).serdes = (opts as any).serdes;
  if (opts.variantClasses) (field as any).variantClasses = opts.variantClasses;

  return field;
}

/* -------------------------------------------------------------------------- */
/* one() builder                                                             */
/* -------------------------------------------------------------------------- */

import type { FieldWithDefault, FieldWithoutDefault } from "@src/types";

type WithoutDefault<T extends Typeable> = Omit<FieldOpts<T>, "default"> & {
  default?: never;
};

interface OneNoSchemaBuilder {
  // Overload: default supplied → FieldWithDefault
  of<T extends Typeable>(
    opts: { default: T | (() => T) } & WithoutDefault<T>,
  ): FieldWithDefault<T>;
  // Overload: no default supplied → FieldWithoutDefault
  of<T extends Typeable>(opts: WithoutDefault<T>): FieldWithoutDefault<T>;
}

interface OneWithSchemaBuilder<S extends SchemaClass> {
  of<T extends Nested<S>>(
    opts: { default: T | (() => T) } & WithoutDefault<T>,
  ): FieldWithDefault<T> & { schemaClass: S };
  of<T extends Nested<S>>(
    opts: WithoutDefault<T>,
  ):
    | (FieldWithoutDefault<T> & { schemaClass: S })
    | (FieldType<T> & { schemaClass: S });
}

export function one(): OneNoSchemaBuilder;
export function one<S extends SchemaClass>(
  schemaClass: S,
): OneWithSchemaBuilder<S>;
export function one(schemaClass?: SchemaClass): any {
  return {
    of<T extends Typeable>(opts: FieldOpts<T>): FieldType<T> {
      return makeField(opts, schemaClass);
    },
  };
}

/* -------------------------------------------------------------------------- */
/* many() builder                                                            */
/* -------------------------------------------------------------------------- */

interface ManyNoSchemaBuilder {
  of<T extends Typeable[]>(
    opts: { default: T | (() => T) } & WithoutDefault<T>,
  ): FieldWithDefault<T>;
  of<T extends Typeable[]>(opts: WithoutDefault<T>): FieldWithoutDefault<T>;
}

interface ManyWithSchemaBuilder<S extends SchemaClass> {
  of<T extends Nested<S>[]>(
    opts: { default: T | (() => T) } & WithoutDefault<T>,
  ): FieldWithDefault<T> & { schemaClass: S };
  of<T extends Nested<S>[]>(
    opts: WithoutDefault<T>,
  ): FieldWithoutDefault<T> & { schemaClass: S };
}

export function many(): ManyNoSchemaBuilder;
export function many<S extends SchemaClass>(
  schemaClass: S,
): ManyWithSchemaBuilder<S>;
export function many(schemaClass?: SchemaClass): any {
  return {
    of<T extends Typeable>(opts: FieldOpts<T>): FieldType<T> {
      return makeField(opts, schemaClass);
    },
  };
}
