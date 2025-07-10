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

import type { FieldOpts as LegacyFieldOpts } from "@src/field";

// ---------------------------------------------------------------------------
// Extended v3-specific FieldOpts additions
// ---------------------------------------------------------------------------

/**
 * Extra options introduced by the API v3 runtime descriptor migration.  These
 * keys are *not* present in the legacy builder but are harmlessly ignored by
 * existing call-sites because we intersect them onto the previous type.
 */
interface FieldExtras {
  /** Marks the field as optional (omitting it in the constructor is allowed). */
  optional?: boolean;

  /** When `true`, the field accepts `null` in addition to its regular type. */
  nullable?: boolean;

  /** Human-readable description forwarded to JSON-Schema `description`. */
  described?: string;
}

import type { RawOfSpec, TypedSpec, ValueOfSpec } from "./typed.js";

// ---------------------------------------------------------------------------
// FieldOpts — identical to the v2 version, re-exported for convenience.
// ---------------------------------------------------------------------------

export type FieldOpts<T extends Typeable, R = T> = LegacyFieldOpts<T, R> &
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

export function many<S extends SchemaClass | TypedSpec<any, any>>(
  spec: S,
  opts: FieldOpts<Array<ValueOf<S>>, Array<RawOf<S>>> = {},
): FieldType<Array<ValueOf<S>>, Array<RawOf<S>>> & { spec: S } {
  // Cast `opts` through `unknown` to bypass the mismatch between the single-
  // value signature expected by `makeField()` and the array-wrapped variant we
  // expose here.  Properly specialised helpers will land in a later phase.
  const field = makeField(
    spec,
    opts as unknown as FieldOpts<ValueOf<S>, RawOf<S>>,
  ) as FieldType<Array<ValueOf<S>>, Array<RawOf<S>>> & { spec: S };
  (field as any).cardinality = "many";
  return field;
}
