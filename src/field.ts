/*
 * Prototype implementation of `one()` / `many()` builders — **API v3**
 * ------------------------------------------------------------------
 *
 * These functions mirror the legacy builders found in `src/field.ts` but take
 * a **runtime descriptor** (`TypedSpec` from `v3/typed.ts`) instead of generic
 * type parameters.  At this stage we only care about *typing* and the ability
 * to attach `spec` metadata — full validation & JSON-Schema emission will land
 * in the next migration phases.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  FieldType,
  SchemaClass,
  Typeable,
  InputOf,
  OutputOf,
} from "@src/types";
import type { LogicalConstraint, Serdes } from "@src/types";

// ---------------------------------------------------------------------------
// Extended v3-specific FieldOpts additions
// ---------------------------------------------------------------------------

/**
 * Extra options introduced by the API v3 runtime descriptor migration.  These
 * keys are *not* present in the legacy builder but are harmlessly ignored by
 * existing call-sites because we intersect them onto the previous type.
 */
/**
 * Core builder options shared between both `one()` and `many()`.
 * Extracted from the removed legacy builder so we can drop the file while
 * keeping the public type contract intact.
 */
export interface BaseFieldOpts<T extends Typeable, R = T> {
  /** Optional default value or thunk returning the value. */
  default?: T | (() => T);

  /** Runtime validator (or array of validators). */
  is?: LogicalConstraint<NonNullable<T>> | LogicalConstraint<NonNullable<T>>[];

  /** Custom serialisation/deserialisation tuple. */
  serdes?: Serdes<T, R>;

  /**
   * Explicit discriminated-union support. When provided **Type-A** picks the
   * constructor at runtime based on the incoming raw object’s discriminator
   * value.
   */
  variantClasses?: SchemaClass[];
}

interface FieldExtras {
  /** Marks the field as optional (omitting it in the constructor is allowed). */
  optional?: boolean;

  /** When `true`, the field accepts `null` in addition to its regular type. */
  nullable?: boolean;

  /** Human-readable description forwarded to JSON-Schema `description`. */
  described?: string;

  /**
   * When used with {@link many}, declares that the collection should be a
   * `Set` instead of the default `Array`.  This flag has **no effect** when
   * passed to {@link one}.
   */
  asSet?: boolean;
}

import type { RawOfSpec, TypedSpec, ValueOfSpec } from "./typed.js";

// ---------------------------------------------------------------------------
// FieldOpts — identical to the v2 version, re-exported for convenience.
// ---------------------------------------------------------------------------

export type FieldOpts<T extends Typeable, R = T> = BaseFieldOpts<T, R> &
  FieldExtras;

// ---------------------------------------------------------------------------
// Helper type utilities for SchemaClass specs.
// ---------------------------------------------------------------------------

type ValueOfSchema<S extends SchemaClass> = OutputOf<S>;
type RawOfSchema<S extends SchemaClass> = InputOf<S>;

type ValueOf<S> = S extends SchemaClass
  ? ValueOfSchema<S>
  : S extends TypedSpec<any, any>
    ? ValueOfSpec<S>
    : never;

type RawOf<S> = S extends SchemaClass
  ? RawOfSchema<S>
  : S extends TypedSpec<any, any>
    ? RawOfSpec<S>
    : never;

// ---------------------------------------------------------------------------
// Internal helper — constructs the FieldType object.
// ---------------------------------------------------------------------------

function makeField<S extends SchemaClass | TypedSpec<any, any>>(
  spec: S,
  opts: FieldOpts<ValueOf<S>, RawOf<S>> = {},
): FieldType<ValueOf<S>, RawOf<S>> & { spec: S } {
  const field: FieldType<ValueOf<S>, RawOf<S>> & { spec: S } = {
    // Phantom marker — ensures `ValueOf<S>` survives inference.
    __t: undefined as unknown as ValueOf<S>,
    value: undefined as unknown as ValueOf<S>,
    spec,
  } as any;

  // Attach optional metadata identically to the legacy builder.
  if (opts.default !== undefined) (field as any).default = opts.default;
  if (opts.is) (field as any).is = opts.is;
  if (opts.serdes) (field as any).serdes = opts.serdes;

  /* --------------------------------------------------------------- */
  /* v3-specific extras                                              */
  /* --------------------------------------------------------------- */

  if (opts.optional) (field as any).optional = true;
  if (opts.nullable) (field as any).nullable = true;
  if (opts.described) (field as any).description = opts.described;

  // Nested schema handling — if the *spec* is a SchemaClass attach it so that
  // the constructor can rehydrate later on (implemented in Phase C).
  if (typeof spec === "function") {
    (field as any).schemaClass = spec;
  }

  return field;
}

// ---------------------------------------------------------------------------
// one() builder
// ---------------------------------------------------------------------------

export function one<S extends SchemaClass | TypedSpec<any, any>>(
  spec: S,
  opts: FieldOpts<ValueOf<S>, RawOf<S>> = {},
): FieldType<ValueOf<S>, RawOf<S>> & { spec: S } {
  const field = makeField(spec, opts);
  (field as any).cardinality = "one";
  return field;
}

// ---------------------------------------------------------------------------
// many() builder — arrays only for the prototype (Set support later).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// many() builder — supports both Array (default) **and** Set collections.
// ---------------------------------------------------------------------------

// Overload – Array (default)
export function many<S extends SchemaClass | TypedSpec<any, any>>(
  spec: S,
  opts?: FieldOpts<Array<ValueOf<S>>, Array<RawOf<S>>> & {
    asSet?: false | undefined;
  },
): FieldType<Array<ValueOf<S>>, Array<RawOf<S>>> & { spec: S };

// Overload – Set (when opts.asSet === true)
export function many<S extends SchemaClass | TypedSpec<any, any>>(
  spec: S,
  opts: FieldOpts<Set<ValueOf<S>>, Set<RawOf<S>>> & { asSet: true },
): FieldType<Set<ValueOf<S>>, Set<RawOf<S>>> & { spec: S };

// Implementation
export function many<S extends SchemaClass | TypedSpec<any, any>>(
  spec: S,
  opts: any = {},
): FieldType<any, any> & { spec: S } {
  const isSet = (opts as FieldExtras | undefined)?.asSet === true;

  // Cast through `unknown` because `makeField` operates on the *element* type.
  const fieldBase = makeField(
    spec,
    opts as unknown as FieldOpts<ValueOf<S>, RawOf<S>>,
  ) as FieldType<any, any> & { spec: S };

  if (isSet) {
    (fieldBase as any).cardinality = "set";
    return fieldBase as FieldType<Set<ValueOf<S>>, Set<RawOf<S>>> & { spec: S };
  }

  (fieldBase as any).cardinality = "array";
  return fieldBase as FieldType<Array<ValueOf<S>>, Array<RawOf<S>>> & {
    spec: S;
  };
}
