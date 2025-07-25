/*
 * Runtime type-descriptor helpers (`typed as t`)
 * --------------------------------------------------------------------
 *
 * This lightweight module introduces *value-parameter* descriptor objects used by the `one()` /
 * `many()` field builders.  Each helper returns a **runtime** object that carries its *kind*
 * (primitive, enum, union, …) together with phantom generic markers so that TypeScript
 * infers value and raw types.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SchemaClass } from "@src/types";

/**
 * Base interface implemented by every runtime descriptor produced by the `t.*`
 * helpers.
 *
 * @typeParam TVal In-memory value type (what users work with in JS/TS)
 * @typeParam TRaw External/raw representation (e.g. the JSON string produced
 *                  by `Date.toISOString()`).  Defaults to `TVal`.
 */
export interface TypedSpec<TVal, TRaw = TVal> {
  /** Discriminator understood by the validation & schema-emitter pipelines. */
  readonly kind:
    | "primitive"
    | "literal"
    | "enum"
    | "union"
    | "variant"
    | "serdes"
    | "tuple"
    | "map";

  /** Phantom compile-time marker preserving `TVal`. */
  readonly __v?: TVal;

  /** Phantom compile-time marker preserving `TRaw`. */
  readonly __r?: TRaw;

  // ---------------------------------------------------------------------
  // Per-kind metadata placeholders (all optional, populated by helpers).
  // ---------------------------------------------------------------------
  /** For `literal` specs. */
  readonly literal?: TVal;

  /** For `enum` specs. */
  readonly enumObject?: Record<string, string | number>;

  /** For `union` / `variant` specs. */
  readonly ctors?: readonly SchemaClass[];

  /**
   * For `tuple` specs – ordered list of element descriptors.
   */
  readonly specs?: readonly TypedSpec<any, any>[];

  /**
   * For `map` specs.
   */
  readonly keySpec?: TypedSpec<any, any>;
  readonly valueSpec?: TypedSpec<any, any>;

  /**
   * For `variant` specs the discriminating property name used to pick the
   * constructor and surfaced in JSON-Schema output.  When omitted it defaults
   * to the widely-used "kind" key.
   */
  readonly discriminator?: { propertyName: string };

  /** For `serdes` specs: descriptor of the _raw_ representation. */
  readonly rawSpec?: TypedSpec<TRaw>;
}

// -------------------------------------------------------------------------
// Helper type utilities — extract compile-time info from any `TypedSpec`.
// -------------------------------------------------------------------------

export type ValueOfSpec<S> = S extends TypedSpec<infer V, any> ? V : never;

export type RawOfSpec<S> = S extends TypedSpec<any, infer R> ? R : never;

// -------------------------------------------------------------------------
// `t` factory — mirrors the table in the design spec comment.
// -------------------------------------------------------------------------

export const t = {
  /* -------------------------- primitives --------------------------- */

  string: {
    kind: "primitive",
    // Use an `undefined` phantom marker to avoid enumerable runtime values.
    __v: undefined as unknown as string,
  } as TypedSpec<string>,

  number: {
    kind: "primitive",
    __v: undefined as unknown as number,
  } as TypedSpec<number>,

  boolean: {
    kind: "primitive",
    __v: undefined as unknown as boolean,
  } as TypedSpec<boolean>,

  /* ---------------------------- bigint ---------------------------- */

  /**
   * Native `bigint` primitive descriptor.
   */
  bigint: {
    kind: "primitive",
    __v: undefined as unknown as bigint,
  } as TypedSpec<bigint>,

  /* ----------------------------- tuple ---------------------------- */

  /**
   * Tuple descriptor – describes a fixed-length ordered list where each
   * position has its own `TypedSpec`.
   */
  tuple<Specs extends readonly TypedSpec<any, any>[]>(
    ...specs: Specs
  ): TypedSpec<
    { [I in keyof Specs]: ValueOfSpec<Specs[I]> },
    { [I in keyof Specs]: RawOfSpec<Specs[I]> }
  > {
    return {
      kind: "tuple",
      specs,
    } as TypedSpec<
      { [I in keyof Specs]: ValueOfSpec<Specs[I]> },
      { [I in keyof Specs]: RawOfSpec<Specs[I]> }
    >;
  },

  /* ------------------------------ map ----------------------------- */

  /**
   * Map / Record descriptor. Accepts both plain JS objects (record) **and**
   * `Map` instances at runtime.  Compile-time representation is a
   * `Record<K, V>` so that callers can conveniently access properties via
   * `obj[key]` without the indirection of `Map.get()`.
   */
  map<
    KeySpec extends TypedSpec<any, any>,
    ValueSpec extends TypedSpec<any, any>,
  >(
    keySpec: KeySpec,
    valueSpec: ValueSpec,
  ): TypedSpec<
    | Record<ValueOfSpec<KeySpec>, ValueOfSpec<ValueSpec>>
    | Map<ValueOfSpec<KeySpec>, ValueOfSpec<ValueSpec>>,
    | Record<RawOfSpec<KeySpec>, RawOfSpec<ValueSpec>>
    | Map<RawOfSpec<KeySpec>, RawOfSpec<ValueSpec>>
  > {
    return {
      kind: "map",
      keySpec,
      valueSpec,
    } as TypedSpec<
      Record<ValueOfSpec<KeySpec>, ValueOfSpec<ValueSpec>>,
      Record<RawOfSpec<KeySpec>, RawOfSpec<ValueSpec>>
    >;
  },

  /* ----------------------------- literal --------------------------- */

  /**
   * Create a spec for a **literal** value (`"yes"`, `42`, `false`, …).
   */
  literal<L extends string | number | boolean>(val: L): TypedSpec<L> {
    return {
      kind: "literal",
      literal: val,
      __v: val,
    } as TypedSpec<L>;
  },

  /* ------------------------------ enum ----------------------------- */

  /**
   * Enum helper – accepts the enum object and infers the union of its values.
   */
  enum<E extends Record<string, string | number>>(e: E): TypedSpec<E[keyof E]> {
    return {
      kind: "enum",
      enumObject: e,
    } as TypedSpec<E[keyof E]>;
  },

  /* ------------------------- union / variant ----------------------- */

  union<C extends readonly SchemaClass[]>(
    ctors: C,
  ): TypedSpec<
    InstanceType<C[number]>,
    import("@src/types").InputOf<C[number]>
  > {
    type Val = InstanceType<C[number]>;

    return { kind: "union", ctors } as TypedSpec<
      Val,
      import("@src/types").InputOf<C[number]>
    >;
  },

  /**
   * Discriminated union helper – creates a `variant` spec accepting any of the
   * provided `Schema` classes.  At runtime the constructor is chosen based on
   * the value of the `propertyName` (defaults to `"kind"`).
   *
   * @param ctors           Array of `Schema` classes that form the union.
   * @param propertyName    Discriminator key. All branches should have a
   *                        `literal` field with this name.
   */
  variant<C extends readonly SchemaClass[]>(
    ctors: C,
    propertyName: string = "kind",
  ): TypedSpec<
    InstanceType<C[number]>,
    import("@src/types").InputOf<C[number]>
  > {
    type Val = InstanceType<C[number]>;

    return {
      kind: "variant",
      ctors,
      discriminator: { propertyName },
    } as TypedSpec<Val, import("@src/types").InputOf<C[number]>>;
  },

  /* ------------------------------ serdes --------------------------- */

  /**
   * Describe a value (`TVal`) that is stored as `TRaw` in JSON but exposed as
   * `TVal` in userland. The second parameter is **another** descriptor (usually
   * one of the primitives) describing how the raw form should be validated /
   * emitted in JSON Schema.
   */
  serdes<V, TRaw>(
    // The *value example* can be either a constructor (e.g. `Date`) **or** an
    // exemplar literal/instance (e.g. `123n` for `bigint`).  We use a
    // conditional type to derive the exposed `TVal` accordingly.
    valExample: V,
    rawSpec: TypedSpec<TRaw>,
  ): TypedSpec<V extends new (...args: any) => infer I ? I : V, TRaw> {
    return {
      kind: "serdes",
      rawSpec,

      __v: undefined as unknown as V extends new (...args: any) => infer I
        ? I
        : V,

      __r: undefined as unknown as TRaw,
    } as TypedSpec<V extends new (...args: any) => infer I ? I : V, TRaw>;
  },
} as const;
