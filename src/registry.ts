/**
 * Simple scoped registry used to associate a *parent* {@link Schema} class
 * with the {@link Schema} constructor(s) that should be used for automatic
 * re-hydration of nested values (arrays or variants) at runtime.
 *
 *   Registry ≅  WeakMap<ParentCtor, Map<fieldName, ChildCtor | ChildCtor[]>>
 *
 * A `WeakMap` is used so that links are released automatically when the parent
 * class itself becomes unreachable (important for test isolation and module
 * hot-reloading).
 *
 * The concrete registration helpers (`nestedArray`, `nestedVariant`) live on
 * {@link Schema} and simply write into the registry instance supplied (or the
 * {@link defaultRegistry} when none is provided).
 */

import type { SchemaClass } from "@src/schema";

/** Shape exported only for typing – implementation is the built-in `WeakMap`. */
export type Registry = WeakMap<
  SchemaClass,
  Map<string, SchemaClass | SchemaClass[]>
>;

/** Factory creating an *empty* scoped registry instance. */
export const createRegistry = (): Registry => new WeakMap();

/**
 * Default process-wide registry used when no explicit registry is supplied.
 */
export const defaultRegistry: Registry = createRegistry();
