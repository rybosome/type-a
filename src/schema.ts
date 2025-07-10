/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ErrLog,
  LogicalConstraint,
  Result,
  Typeable,
  SchemaInstance,
  ValueMap,
  FieldType,
  SchemaClass,
  InputValueMap,
  Fields,
} from "@src/types";

/* ------------------------------------------------------------------ */
/* Built-in primitive validators                                      */
/* ------------------------------------------------------------------ */

/**
 * Minimal set of default validators applied when a field lacks a custom
 * {@link FieldType.is} predicate *and* is not bound to a nested
 * {@link Schema} or discriminated union.  They provide the basic runtime
 * guarantees historically offered by *type-a* without forcing callers to
 * repeat common `typeof` checks.
 */
const DEFAULT_VALIDATORS: Record<string, LogicalConstraint<any>> = {
  boolean: (v: unknown) => (typeof v === "boolean" ? true : "expected boolean"),
  number: (v: unknown) =>
    typeof v === "number" && Number.isFinite(v)
      ? true
      : "expected finite number",
  string: (v: unknown) => (typeof v === "string" ? true : "expected string"),
  array: (v: unknown) => (Array.isArray(v) ? true : "expected array"),
  object: (v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? true
      : "expected plain object",
};

/**
 * Convert an Array or Set to a plain array for uniform iteration semantics.
 * Returns `null` when the supplied value is neither.
 *
 * This helper centralises runtime collection detection so that callers avoid
 * duplicating the `Array.isArray` vs `instanceof Set` branching logic.
 */
function asIterable(v: unknown): unknown[] | null {
  if (Array.isArray(v)) return v;
  if (v instanceof Set) return Array.from(v);
  return null;
}

/**
 * Combine several constraints into one.  Runs each in sequence and returns the
 * first non-`true` result (an error string) or `true` when all pass.
 */
function composeConstraints<T extends Typeable>(
  constraints: LogicalConstraint<T>[],
): LogicalConstraint<T> {
  return (val: T) => {
    for (const c of constraints) {
      const res = c(val);
      if (res !== true) return res;
    }
    return true;
  };
}

/**
 * A dataclass-style object with parsing, validation and rendering.
 */
export class Schema<F extends Fields> implements SchemaInstance {
  readonly __isSchemaInstance = true as const;
  private readonly _fields: {
    [K in keyof F]: FieldType<ValueMap<F>[K]>;
  };

  constructor(input: InputValueMap<F>) {
    const schema = (this.constructor as unknown as { _schema: F })._schema;

    const fields = {} as {
      [K in keyof F]: FieldType<ValueMap<F>[K]>;
    };

    for (const [key, fieldDef] of Object.entries(schema) as [
      keyof F,
      F[keyof F],
    ][]) {
      if (!fieldDef.schemaClass && "__t" in fieldDef) {
        const rawT = (fieldDef as any).__t;
        const maybeInstance = Array.isArray(rawT) ? rawT[0] : rawT;

        if (
          maybeInstance &&
          typeof maybeInstance === "object" &&
          maybeInstance.constructor?._schema
        ) {
          (fieldDef as any).schemaClass = maybeInstance.constructor;
          console.error(
            `✅ schemaClass inferred for field '${String(key)}':`,
            maybeInstance.constructor.name,
          );
        }
      }
      const supplied = (input as Record<string, unknown>)[key as string];
      const def = fieldDef.default;
      const rawValue =
        supplied !== undefined
          ? supplied
          : typeof def === "function"
            ? (def as () => unknown)()
            : def;

      /* ----------------------------------------------- */
      /* Apply custom deserialiser (raw -> in-memory)    */
      /* ----------------------------------------------- */

      const deserialised = (() => {
        if (!fieldDef.serdes) return rawValue;
        const [, deserialize] = fieldDef.serdes as [
          (val: any) => unknown,
          (raw: unknown) => unknown,
        ];
        // Only transform when value is non-nullish – keep null/undefined as-is.
        if (rawValue === null || rawValue === undefined) return rawValue;
        return deserialize(rawValue as any);
      })();

      // Handle nested Schema instantiation when necessary
      const nestedValue = (() => {
        const singleCtor = fieldDef.schemaClass;
        const ctorSet = fieldDef.variantClasses;

        if (
          (!singleCtor && !ctorSet) ||
          deserialised === undefined ||
          deserialised === null
        ) {
          return deserialised;
        }

        // Helper to pick constructor for discriminated unions ----------------
        const pickCtor = (raw: unknown): SchemaClass | undefined => {
          if (singleCtor) return singleCtor;
          if (!ctorSet) return undefined;

          // Simple heuristic: use `kind` discriminator when present.
          const discriminator = (raw as any)?.kind;
          if (discriminator != null) {
            const match = ctorSet.find((C) => {
              try {
                // Attempt cheap prototype check first – avoids full instantiation.
                const schema = (C as any)._schema as Fields;
                if (
                  schema &&
                  Object.prototype.hasOwnProperty.call(schema, "kind") &&
                  // access default or literal value if present
                  (schema.kind as any).default === discriminator
                )
                  return true;
              } catch {
                /* noop */
              }
              return false;
            });
            if (match) return match;
          }

          // Fallback heuristic ------------------------------------------------
          // Choose the constructor whose declared schema keys overlap the most
          // with the raw object's keys.  This is a simple, deterministic
          // approach that works well for typical discriminated unions where
          // each subtype has unique fields.
          if (raw && typeof raw === "object") {
            const rawKeys = new Set(
              Object.keys(raw as Record<string, unknown>),
            );
            let best: SchemaClass | undefined;
            let bestScore = -1;

            for (const C of ctorSet) {
              const keys = Object.keys((C as any)._schema as Fields);
              let score = 0;
              for (const k of keys) if (rawKeys.has(k)) score += 1;
              if (score > bestScore) {
                bestScore = score;
                best = C;
              }
            }
            if (best) return best;
          }

          // As a final fallback, just use the first constructor.
          return ctorSet[0];
        };

        const convert = (val: unknown): unknown => {
          const Ctor = pickCtor(val);
          if (!Ctor) return val; // give up – leave raw
          return val instanceof Ctor ? val : new Ctor(val as any);
        };

        // Array-of-schema support (and Set-of-schema)
        if (Array.isArray(deserialised)) {
          return (deserialised as unknown[]).map(convert);
        }
        if ((deserialised as any) instanceof Set) {
          const converted = new Set<unknown>();
          for (const item of deserialised as Set<unknown>) {
            converted.add(convert(item));
          }
          return converted;
        }
        return convert(deserialised);
      })();

      // nestedValue already computed above; re-use here

      if (fieldDef.schemaClass) {
        console.error(`[${String(key)}] nestedValue:`, nestedValue);
        console.error(
          `[${String(key)}] is instance of schemaClass?`,
          nestedValue instanceof fieldDef.schemaClass,
        );
      }

      const field = {
        value: nestedValue as ValueMap<F>[typeof key],
        is: (() => {
          const rawIs = fieldDef.is as
            | LogicalConstraint<NonNullable<ValueMap<F>[typeof key]>>
            | LogicalConstraint<NonNullable<ValueMap<F>[typeof key]>>[]
            | undefined;
          if (Array.isArray(rawIs)) {
            return rawIs.length > 0 ? composeConstraints(rawIs) : undefined;
          }
          if (rawIs) return rawIs;

          /* ---------------------------------------------------- */
          /* Fallback to built-in primitive validators            */
          /* ---------------------------------------------------- */

          if (!fieldDef.schemaClass && !fieldDef.variantClasses) {
            const runtimeKey = Array.isArray(deserialised)
              ? "array"
              : (deserialised as any) instanceof Set
                ? "set"
                : typeof deserialised;
            const validator = (
              DEFAULT_VALIDATORS as Record<string, LogicalConstraint<any>>
            )[runtimeKey];

            // Cache the derived validator on the *shared* field definition so
            // future instances of the same Schema reuse the correct predicate
            // (crucial when the first construction succeeds but later ones
            // provide invalid values).
            if (validator && !(fieldDef as any).is) {
              (fieldDef as any).is = validator;
            }

            return validator;
          }

          return undefined;
        })(),
        default: fieldDef.default as FieldType<
          ValueMap<F>[typeof key]
        >["default"],
        ...(fieldDef.serdes ? { serdes: fieldDef.serdes } : {}),
        ...(fieldDef.schemaClass ? { schemaClass: fieldDef.schemaClass } : {}),
      } as FieldType<ValueMap<F>[typeof key]>;

      fields[key] = field;

      Object.defineProperty(this, key, {
        get: () => field.value,
        set: (val: ValueMap<F>[typeof key]) => {
          field.value = val;
        },
        enumerable: true,
      });
    }

    this._fields = fields;
  }

  static from<F extends Record<string, FieldType<any>>>(schema: F) {
    class ModelWithSchema extends Schema<F> {
      static _schema = schema;
    }

    type StaticHelpers = {
      /** See {@link Schema.fromJSON} */
      fromJSON(
        input: unknown,
      ): Result<Schema<F> & ValueMap<F>, ErrLog<Schema<F> & ValueMap<F>>>;

      /**
       * @deprecated Use {@link fromJSON} instead. Will be removed in a future
       * major version.
       */
      tryNew(
        input: unknown,
      ): Result<Schema<F> & ValueMap<F>, ErrLog<Schema<F> & ValueMap<F>>>;
    };

    return ModelWithSchema as {
      new (input: InputValueMap<F>): Schema<F> & ValueMap<F>;
      _schema: F;
    } & StaticHelpers;
  }

  /**
   * Static constructor with built-in validation and aggregated error
   * reporting.
   */
  static fromJSON(
    this: {
      // Accept *any* JSON object.  Specific runtime validation still occurs
      // through the constructor and `validate()` calls.
      new (input: any): Schema<any> & Fields;
      _schema: Fields;
    },
    input: unknown,
  ): Result<InstanceType<typeof this>, ErrLog<InstanceType<typeof this>>> {
    // Bypass compile-time checks – the constructor performs runtime
    // validation anyway.

    const instance = new this(input as any);
    const validationErrors = instance.validate();

    if (validationErrors.length === 0) {
      // success path
      return { val: instance, errs: undefined };
    }

    // failure path – build ErrLog with undefined for each field first
    const errLog = Object.keys(this._schema).reduce(
      (acc, key) => {
        (acc as Record<string, string | undefined>)[key] = undefined;
        return acc;
      },
      // Narrow the ErrLog shape to *only* the declared schema keys. This
      // prevents internal/private properties (such as `_fields` or helper
      // methods) from leaking into the public error log surface.
      {} as ErrLog<Pick<InstanceType<typeof this>, keyof typeof this._schema>>,
    );

    // Populate messages parsed from "<key>: <message>" strings.  For built-in
    // *primitive* validators we intentionally keep the full string (including
    // the field prefix) so callers can display a self-contained message
    // without additional context.  Custom validators, however, usually return
    // messages that already omit the field name (e.g. "must not be empty").
    // Detect this by checking for the standard "expected …" prefix.

    for (const raw of validationErrors) {
      const idx = raw.indexOf(": ");
      if (idx === -1) continue;

      const key = raw.slice(0, idx);
      const msg = raw.slice(idx + 2);

      (errLog as Record<string, string | undefined>)[key] = msg.startsWith(
        "expected ",
      )
        ? raw // keep full string for primitive-type errors
        : msg; // otherwise strip the "<key>: " prefix
    }

    errLog.summarize = () => validationErrors.slice();

    return { val: undefined, errs: errLog };
  }

  /**
   * @deprecated Renamed to {@link Schema.fromJSON}.  This alias will be
   * removed in a future major release.
   */
  static tryNew = Schema.fromJSON as unknown as (typeof Schema & {
    fromJSON: typeof Schema.fromJSON;
  })["fromJSON"];

  validate(): string[] {
    const schema = (this.constructor as unknown as { _schema: F })._schema;
    const errors: string[] = [];

    for (const key in schema) {
      const field = this._fields[key as keyof F];

      /* ---------------------------------------------------------- */
      /* Recurse into nested Schemas                                */
      /* ---------------------------------------------------------- */
      if (field.value != null) {
        const pushNestedErrors = (item: Schema<any>, prefix: string) => {
          const nestedErrors = item.validate();
          for (const msg of nestedErrors) errors.push(`${prefix}.${msg}`);
        };

        const iterable = asIterable(field.value);

        if (iterable) {
          iterable.forEach((item: unknown, idx: number) => {
            if ((item as any)?.__isSchemaInstance) {
              pushNestedErrors(item as Schema<any>, `${key}[${idx}]`);
            }
          });
        } else if ((field.value as any)?.__isSchemaInstance) {
          pushNestedErrors(field.value as Schema<any>, String(key));
        }
      }

      // Cast `is` so we have a stable, callable signature
      const is = field.is as ((val: unknown) => true | string) | undefined;

      if (is && field.value !== undefined && field.value !== null) {
        // Apply validator differently for array vs single value
        const iterable = asIterable(field.value);
        if (iterable) {
          iterable.forEach((item: unknown, idx: number) => {
            const res = is(item);
            if (res !== true) errors.push(`${key}[${idx}]: ${res}`);
          });
        } else {
          const result = is(field.value as NonNullable<typeof field.value>);
          if (result !== true) errors.push(`${key}: ${result}`);
        }
      }
    }

    return errors;
  }

  toJSON(): ValueMap<F> {
    /**
     * Recursively serialise a runtime value so that the result is fully
     * JSON-compatible (plain objects, arrays and primitives only).  Schema
     * instances invoke their own `toJSON()` method; `Map` instances are
     * converted to plain objects via `Object.fromEntries()` while their values
     * are serialised recursively.
     */
    const serialise = (val: unknown): unknown => {
      if (val == null) return val;

      /* -------------------------------------------------- */
      /* Primitive BigInt handling                          */
      /* -------------------------------------------------- */
      // Native `JSON.stringify` throws on BigInt values.  Convert to a
      // string representation so callers can safely serialise the output
      // produced by `Schema#toJSON()` without additional hooks.
      if (typeof val === "bigint") return val.toString();

      if (Array.isArray(val)) return val.map(serialise);
      if (val instanceof Set) return Array.from(val).map(serialise);
      if (val instanceof Map) {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of val.entries()) {
          // Convert key to string for use as an object property
          const key = String(k);
          // Guard against collisions such as 1 vs "1" or true vs "true"
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            throw new Error(
              `Duplicate key after stringification: ${String(k)}`,
            );
          }
          obj[key] = serialise(v);
        }
        return obj;
      }

      if (typeof val === "object") {
        // Preserve run-time identity for `Schema` instances – they manage their own serialisation.
        if ((val as any).__isSchemaInstance) {
          return (val as Schema<any>).toJSON();
        }

        /* ------------------------------------------------------ */
        /* Plain-object (Record) detection                         */
        /* ------------------------------------------------------ */
        const proto = Object.getPrototypeOf(val);
        if (proto === Object.prototype || proto === null) {
          const obj: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            obj[k] = serialise(v);
          }
          return obj;
        }

        // Exotic objects (Date, RegExp, custom classes, etc.) – return as-is so callers can decide.
        // TODO: this might overlook the case where serdes was used to bind to an object - we should handle that here
        return val;
      }
      return val; // primitive scalar
    };

    const json = {} as ValueMap<F>;
    for (const key in this._fields) {
      const field = this._fields[key];
      const raw = (() => {
        if (field.value == null) return field.value;

        const iterable = asIterable(field.value);
        if (iterable) {
          return iterable.map((v: unknown) =>
            (v as any)?.__isSchemaInstance ? (v as Schema<any>).toJSON() : v,
          );
        }

        return (field.value as any)?.__isSchemaInstance
          ? (field.value as Schema<any>).toJSON()
          : field.value;
      })();
      // Apply custom serialiser when supplied (in-memory -> raw)
      const rendered = (() => {
        if (!field.serdes) return raw;
        const [serialize] = field.serdes as [
          (val: unknown) => unknown,
          (raw: unknown) => unknown,
        ];
        if (raw == null) return raw;
        if (Array.isArray(raw)) return raw.map(serialize);
        if (raw instanceof Set) {
          const transformed: unknown[] = [];
          for (const item of raw as Set<unknown>)
            transformed.push(serialize(item));
          return transformed;
        }
        return serialize(raw);
      })();

      // Recursively serialise (handles Map & nested objects)
      (json as Record<string, unknown>)[key] = serialise(rendered);
    }
    return json;
  }
}
