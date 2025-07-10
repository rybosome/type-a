/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  FieldType,
  LogicalConstraint,
  Nested,
  SchemaClass,
  Typeable,
  Serdes,
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
   * Custom serialisation/deserialisation tuple.  See {@link Serdes}.
   */
  serdes?: Serdes<T, R>;

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

/**
 * Helper type used by the builder overloads when *no* default value is
 * supplied.  It is simply the {@link FieldOpts} interface minus the optional
 * `default` key.  We intentionally do **not** try to outlaw `default` via
 * `& { default?: never }` because that makes it impossible for an intersection
 * with a *required* default (used by the other overload) to succeed – the
 * conflicting property types (`never` vs `T`) collapse to `never`, breaking
 * overload resolution.
 */

/* -------------------------------------------------------------------------- */
/* Helper type utilities                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Extract the *in-memory* value type from a `one().of` generic spec.
 *
 *   ValueOfSpec<string>                     -> string
 *   ValueOfSpec<Serdes<Date, string>>       -> Date
 */
type ValueOfSpec<S> = S extends Serdes<infer V, any> ? V : S;

/**
 * Extract the *raw* (serialised) representation type from the same spec.
 * When the spec is not a {@link Serdes} tuple the type defaults to the value
 * type so nothing changes compared to the legacy behaviour.
 */
type RawOfSpec<S> = S extends Serdes<any, infer R> ? R : S;

/**
 * Variant of {@link WithoutDefault} that operates on a *spec* type (either a
 * plain Typeable or a `Serdes<…>` tuple).
 */
type WithoutDefaultSpec<S> = Omit<
  FieldOpts<
    ValueOfSpec<S> extends Typeable ? ValueOfSpec<S> : never,
    RawOfSpec<S>
  >,
  "default"
>;

interface OneNoSchemaBuilder {
  /** Overload: `default` supplied → returns `FieldWithDefault` */
  of<Spec extends Typeable | Serdes<any, any>>(
    opts: FieldOpts<ValueOfSpec<Spec>, RawOfSpec<Spec>> & {
      default: ValueOfSpec<Spec> | (() => ValueOfSpec<Spec>);
    },
  ): FieldWithDefault<ValueOfSpec<Spec>, RawOfSpec<Spec>>;

  /** Overload: no `default` supplied → returns `FieldWithoutDefault` */
  of<Spec extends Typeable | Serdes<any, any>>(
    opts: WithoutDefaultSpec<Spec>,
  ): FieldWithoutDefault<ValueOfSpec<Spec>, RawOfSpec<Spec>>;
}

interface OneWithSchemaBuilder<S extends SchemaClass> {
  of<Spec extends Nested<S> | Serdes<any, any>>(
    opts: FieldOpts<ValueOfSpec<Spec>, RawOfSpec<Spec>> & {
      default: ValueOfSpec<Spec> | (() => ValueOfSpec<Spec>);
    },
  ): FieldWithDefault<ValueOfSpec<Spec>, RawOfSpec<Spec>> & { schemaClass: S };

  of<Spec extends Nested<S> | Serdes<any, any>>(
    opts: WithoutDefaultSpec<Spec>,
  ): FieldWithoutDefault<ValueOfSpec<Spec>, RawOfSpec<Spec>> & {
    schemaClass: S;
  };
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
  of<Spec extends (Typeable | Serdes<any, any>)[]>(
    opts: FieldOpts<ValueOfSpec<Spec>, RawOfSpec<Spec>> & {
      default: ValueOfSpec<Spec> | (() => ValueOfSpec<Spec>);
    },
  ): FieldWithDefault<ValueOfSpec<Spec>, RawOfSpec<Spec>>;

  of<Spec extends (Typeable | Serdes<any, any>)[]>(
    opts: WithoutDefaultSpec<Spec>,
  ): FieldWithoutDefault<ValueOfSpec<Spec>, RawOfSpec<Spec>>;

  // --------------------------
  // Set<T> overloads
  // --------------------------

  of<Spec extends Set<Typeable>>(
    opts: FieldOpts<Spec, Spec> & {
      default: Spec | (() => Spec);
    },
  ): FieldWithDefault<Spec, Spec>;

  of<Spec extends Set<Typeable>>(
    opts: WithoutDefaultSpec<Spec>,
  ): FieldWithoutDefault<Spec, Spec>;
}

interface ManyWithSchemaBuilder<S extends SchemaClass> {
  of<Spec extends (Nested<S> | Serdes<any, any>)[]>(
    opts: FieldOpts<ValueOfSpec<Spec>, RawOfSpec<Spec>> & {
      default: ValueOfSpec<Spec> | (() => ValueOfSpec<Spec>);
    },
  ): FieldWithDefault<ValueOfSpec<Spec>, RawOfSpec<Spec>> & { schemaClass: S };

  of<Spec extends (Nested<S> | Serdes<any, any>)[]>(
    opts: WithoutDefaultSpec<Spec>,
  ): FieldWithoutDefault<ValueOfSpec<Spec>, RawOfSpec<Spec>> & {
    schemaClass: S;
  };

  // Set<T> overloads (nested schema not supported for sets yet – treat as primitive)
  of<Spec extends Set<Typeable>>(
    opts: FieldOpts<Spec, Spec> & {
      default: Spec | (() => Spec);
    },
  ): FieldWithDefault<Spec, Spec> & { schemaClass: S };

  of<Spec extends Set<Typeable>>(
    opts: WithoutDefaultSpec<Spec>,
  ): FieldWithoutDefault<Spec, Spec> & { schemaClass: S };
}

export function many(): ManyNoSchemaBuilder;
export function many<S extends SchemaClass>(
  schemaClass: S,
): ManyWithSchemaBuilder<S>;
export function many(schemaClass?: SchemaClass): any {
  return {
    of<T extends Typeable[] | Set<Typeable>>(opts: FieldOpts<T>): FieldType<T> {
      return makeField(opts, schemaClass);
    },
  };
}
