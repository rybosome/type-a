/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Runtime `Schema` implementation backed by `TypedSpec` descriptors.
 */

import type {
  ErrLog,
  Fields,
  FieldType,
  InputValueMap,
  LogicalConstraint,
  Result,
  SchemaClass,
  SchemaInstance,
  Typeable,
  ValueMap,
} from "@src/types";
import { TypedSpec, t } from "@src/typed";

// ---------------------------------------------------------------------------
// Built-in primitive validators
// ---------------------------------------------------------------------------

const DEFAULT_VALIDATORS: Record<string, LogicalConstraint<any>> = {
  boolean: (v: unknown) => (typeof v === "boolean" ? true : "expected boolean"),
  number: (v: unknown) =>
    typeof v === "number" && Number.isFinite(v)
      ? true
      : "expected finite number",
  string: (v: unknown) => (typeof v === "string" ? true : "expected string"),
  bigint: (v: unknown) => (typeof v === "bigint" ? true : "expected bigint"),
  array: (v: unknown) => (Array.isArray(v) ? true : "expected array"),
  set: (v: unknown) => (v instanceof Set ? true : "expected set"),
  object: (v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? true
      : "expected plain object",
};

// ---------------------------------------------------------------------------
// Helpers – tiny utilities shared by constructor / validate / toJSON / schema
// ---------------------------------------------------------------------------

function asIterable(v: unknown): unknown[] | null {
  if (Array.isArray(v)) return v;
  if (v instanceof Set) return Array.from(v);
  return null;
}

function composeConstraints<T extends Typeable>(
  cs: LogicalConstraint<T>[],
): LogicalConstraint<T> {
  return (val: T) => {
    for (const c of cs) {
      const res = c(val);
      if (res !== true) return res;
    }
    return true;
  };
}

// ---------------------------------------------------------------------------
// Runtime validation against a `TypedSpec` (single scalar value)
// ---------------------------------------------------------------------------

function validateValueAgainstSpec(
  value: unknown,
  spec: TypedSpec<any, any>,
): true | string {
  switch (spec.kind) {
    case "primitive": {
      const runtimeKey = Array.isArray(value)
        ? "array"
        : value instanceof Set
          ? "set"
          : typeof value;

      // Derive the *expected* primitive key from the descriptor instance so
      // that we can cross-check (e.g. `t.string` only accepts `string`).
      let expectedKey: string | undefined;
      if (spec === t.string) expectedKey = "string";
      else if (spec === t.number) expectedKey = "number";
      else if (spec === t.boolean) expectedKey = "boolean";
      else if (spec === t.bigint) expectedKey = "bigint";

      if (expectedKey && expectedKey !== runtimeKey) {
        return `expected ${expectedKey}`;
      }

      const validator = DEFAULT_VALIDATORS[runtimeKey];
      return validator ? validator(value) : true;
    }
    case "literal": {
      return value === spec.literal
        ? true
        : `expected literal ${String(spec.literal)}`;
    }
    case "enum": {
      const allowed = Object.values(spec.enumObject ?? {});
      return allowed.includes(value as never)
        ? true
        : `expected one of ${allowed.map(String).join(", ")}`;
    }
    case "serdes": {
      // Validate *raw* value against the rawSpec (always primitive/enum/literal)
      return validateValueAgainstSpec(value, spec.rawSpec!);
    }

    case "tuple": {
      if (!Array.isArray(value)) return "expected array (tuple)";
      if (value.length !== (spec.specs?.length ?? 0))
        return `expected tuple length ${spec.specs?.length ?? 0}`;
      for (let i = 0; i < (spec.specs?.length ?? 0); i += 1) {
        const r = validateValueAgainstSpec(value[i], spec.specs![i]);
        if (r !== true) return `tuple[${i}]: ${r}`;
      }
      return true;
    }

    case "map": {
      const entries = (() => {
        if (value instanceof Map) return Array.from(value.entries());
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return Object.entries(value as Record<string, unknown>);
        }
        return null;
      })() as [unknown, unknown][] | null;

      if (!entries) return "expected map or object";

      for (const [k, v] of entries) {
        const kr = validateValueAgainstSpec(k, spec.keySpec!);
        if (kr !== true) return `key ${String(k)}: ${kr}`;
        const vr = validateValueAgainstSpec(v, spec.valueSpec!);
        if (vr !== true) return `value for ${String(k)}: ${vr}`;
      }
      return true;
    }
    case "union":
    case "variant": {
      // For raw value validation we simply ensure the value is an object; the
      // nested Schema validation will be executed after instantiation.
      return value !== null && typeof value === "object"
        ? true
        : "expected object";
    }
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// pickCtor – simple heuristic to choose a constructor from `spec.ctors`
// ---------------------------------------------------------------------------

function pickCtor(
  raw: unknown,
  ctors: readonly SchemaClass[],
  discriminatorProp: string = "kind",
): SchemaClass {
  if (!raw || typeof raw !== "object") return ctors[0];

  // Discriminator property heuristic.
  const discriminator = (raw as any)[discriminatorProp];
  if (discriminator != null) {
    const match = ctors.find((C) => {
      try {
        const schema = (C as any)._schema as Fields;
        const field = (schema as any)[discriminatorProp] as
          | FieldType<any>
          | undefined;
        if (!field) return false;
        const litSpec = (field as any).spec as TypedSpec<any> | undefined;
        return litSpec?.kind === "literal" && litSpec.literal === discriminator;
      } catch {
        return false;
      }
    });
    if (match) return match;
  }

  // Overlap heuristic – count matching keys
  const rawKeys = new Set(Object.keys(raw as Record<string, unknown>));
  let best: SchemaClass | undefined;
  let bestScore = -1;
  for (const C of ctors) {
    const keys = Object.keys((C as any)._schema as Fields);
    let score = 0;
    for (const k of keys) if (rawKeys.has(k)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = C;
    }
  }
  return best ?? ctors[0];
}

// ---------------------------------------------------------------------------
// Schema – main class
// ---------------------------------------------------------------------------

export class Schema<F extends Fields> implements SchemaInstance {
  readonly __isSchemaInstance = true as const;

  private readonly _fields: {
    [K in keyof F]: FieldType<ValueMap<F>[K]> & { spec?: TypedSpec<any> };
  };

  constructor(input: InputValueMap<F>) {
    const declared = (this.constructor as unknown as { _schema: F })._schema;

    const fields = {} as {
      [K in keyof F]: FieldType<ValueMap<F>[K]> & { spec?: TypedSpec<any> };
    };

    for (const [key, fieldDef] of Object.entries(declared) as [
      keyof F,
      F[keyof F],
    ][]) {
      const spec = (fieldDef as any).spec as
        | TypedSpec<any>
        | SchemaClass
        | undefined;

      // -------------------------------------------------------------------
      // Determine raw input value / apply default
      // -------------------------------------------------------------------

      const supplied = (input as Record<string, unknown>)[key as string];
      const def = (fieldDef as any).default;
      const rawValue =
        supplied !== undefined
          ? supplied
          : typeof def === "function"
            ? (def as () => unknown)()
            : def;

      // Keep a reference to the raw value so that validators for `serdes` can
      // inspect it later.  We store it on an intermediate variable for now –
      // after deserialisation we overwrite the actual `field.value`.
      const rawForSerdes = rawValue;

      // -------------------------------------------------------------------
      // pre-validation for serdes raw values
      // -------------------------------------------------------------------

      if (
        spec &&
        typeof spec === "object" &&
        "kind" in spec &&
        spec.kind === "serdes"
      ) {
        const pre = validateValueAgainstSpec(rawForSerdes, spec.rawSpec!);
        if (pre !== true) {
          throw new Error(`${String(key)}: ${pre}`);
        }
      }

      // -------------------------------------------------------------------
      // Apply custom deserializer (opts.serdes)
      // -------------------------------------------------------------------

      const deserialised = (() => {
        const sd = (fieldDef as any).serdes as
          | [(val: any) => unknown, (raw: unknown) => unknown]
          | null
          | undefined;
        if (!sd) return rawValue;
        const [, deserialize] = sd;
        if (rawValue === null || rawValue === undefined) return rawValue;
        return deserialize(rawValue as any);
      })();

      // -------------------------------------------------------------------
      // Nested Schema instantiation (single / many) + union/variant
      // -------------------------------------------------------------------

      const coerceNested = (val: unknown): unknown => {
        // 1. Explicit schemaClass (nested single)
        if ((fieldDef as any).schemaClass) {
          const Ctor = (fieldDef as any).schemaClass as SchemaClass;
          return val instanceof Ctor ? val : new Ctor(val as any);
        }

        // 2. union / variant spec – pick constructor heuristically.
        if (
          spec &&
          typeof spec === "object" &&
          (spec.kind === "union" || spec.kind === "variant")
        ) {
          const ctor = pickCtor(
            val,
            spec.ctors!,
            spec.discriminator?.propertyName ?? "kind",
          );
          return val instanceof ctor ? val : new ctor(val as any);
        }

        return val;
      };

      const nestedValue = (() => {
        if (deserialised === undefined || deserialised === null)
          return deserialised;

        const iterable = asIterable(deserialised);
        if (iterable) {
          const mapped = iterable.map(coerceNested);
          const card = (fieldDef as any).cardinality ?? "array";
          if (card === "set") {
            return new Set(mapped);
          }
          return mapped;
        }

        return coerceNested(deserialised);
      })();

      // -------------------------------------------------------------------
      // Build FieldType object used at runtime
      // -------------------------------------------------------------------

      const field = {
        ...fieldDef,
        value: nestedValue as ValueMap<F>[typeof key],
        _raw: rawForSerdes,
      } as FieldType<ValueMap<F>[typeof key]> & {
        spec?: TypedSpec<any>;
        _raw?: unknown;
      };

      fields[key] = field;

      Object.defineProperty(this, key, {
        enumerable: true,
        get: () => field.value,
        set: (v: ValueMap<F>[typeof key]) => {
          field.value = v;
        },
      });
    }

    this._fields = fields;
  }

  /* --------------------------------------------------------------------- */
  /* Validation                                                             */
  /* --------------------------------------------------------------------- */

  validate(): string[] {
    const errors: string[] = [];

    for (const [key, field] of Object.entries(this._fields) as [
      keyof F,
      (typeof this._fields)[keyof F & keyof typeof this._fields],
    ][]) {
      const spec = (field as any).spec as
        | TypedSpec<any>
        | SchemaClass
        | undefined;

      const val = field.value;
      // Optional / nullable short-circuit
      const isOptional = (field as any).optional;
      const isNullable = (field as any).nullable;
      if (val === undefined) {
        if (isOptional) continue; // ok
        errors.push(`${String(key)}: is required`);
        continue;
      }
      if (val === null && isNullable) continue;

      // 1. Custom validator(s) ------------------------------------------------
      const is = field.is as
        | LogicalConstraint<any>
        | LogicalConstraint<any>[]
        | undefined;
      const runValidators = (candidate: unknown, prefix: string) => {
        if (!is) return;
        const res = Array.isArray(is)
          ? composeConstraints(is as LogicalConstraint<any>[])(candidate)
          : is(candidate);
        if (res !== true) errors.push(`${prefix}: ${res}`);
      };

      // 2. Nested Schema recursion ------------------------------------------
      const recurseNested = (candidate: unknown, prefix: string) => {
        if ((candidate as any)?.__isSchemaInstance) {
          const nested = candidate as Schema<any>;
          for (const msg of nested.validate()) {
            errors.push(`${prefix}.${msg}`);
          }
        }
      };

      // ------------------------------------------------------------------
      // Tuple / Map short-circuit – treat entire value as scalar for the
      // purpose of per-field validation (do NOT iterate over elements).
      // ------------------------------------------------------------------

      if (
        spec &&
        typeof spec === "object" &&
        (spec.kind === "tuple" || spec.kind === "map")
      ) {
        const r = validateValueAgainstSpec(val, spec as TypedSpec<any>);
        if (r !== true) errors.push(`${String(key)}: ${r}`);

        runValidators(val, String(key));

        if (spec.kind === "tuple" && Array.isArray(val)) {
          (val as unknown[]).forEach((item, idx) =>
            recurseNested(item, `${String(key)}[${idx}]`),
          );
        }
        if (spec.kind === "map") {
          const entriesVals: unknown[] =
            (val as any) instanceof Map
              ? Array.from((val as Map<unknown, unknown>).values())
              : typeof val === "object" && val !== null
                ? Object.values(val as Record<string, unknown>)
                : [];
          entriesVals.forEach((v) => recurseNested(v, String(key)));
        }
        continue; // skip the rest of the loop for this field
      }

      const iterable = asIterable(val);
      if (iterable) {
        iterable.forEach((item, idx) => {
          // Primitive / enum / literal validation per item
          if (
            spec &&
            typeof spec === "object" &&
            "kind" in spec &&
            spec.kind !== "union" &&
            spec.kind !== "variant" &&
            spec.kind !== "serdes" &&
            !(field as any).schemaClass
          ) {
            const r = validateValueAgainstSpec(item, spec as TypedSpec<any>);
            if (r !== true) errors.push(`${String(key)}[${idx}]: ${r}`);
          }

          runValidators(item, `${String(key)}[${idx}]`);
          recurseNested(item, `${String(key)}[${idx}]`);

          // Union / variant items validation
          if (
            spec &&
            typeof spec === "object" &&
            (spec.kind === "union" || spec.kind === "variant")
          ) {
            if (!(item as any)?.__isSchemaInstance) {
              try {
                const ctor = pickCtor(
                  item,
                  spec.ctors!,
                  spec.discriminator?.propertyName ?? "kind",
                );
                const instance = new ctor(item as any) as Schema<any>;
                for (const msg of instance.validate()) {
                  errors.push(`${String(key)}[${idx}].${msg}`);
                }
              } catch (e) {
                errors.push(`${String(key)}[${idx}]: ${(e as Error).message}`);
              }
            }
          }
        });
        continue;
      }

      // Single value path -----------------------------------------------------
      if (
        spec &&
        typeof spec === "object" &&
        "kind" in spec &&
        spec.kind !== "union" &&
        spec.kind !== "variant" &&
        spec.kind !== "serdes" &&
        !(field as any).schemaClass
      ) {
        const r = validateValueAgainstSpec(val, spec as TypedSpec<any>);
        if (r !== true) errors.push(`${String(key)}: ${r}`);
      }

      runValidators(val, String(key));
      recurseNested(val, String(key));

      // 3. Union / variant runtime validation ---------------------------
      if (
        spec &&
        typeof spec === "object" &&
        (spec.kind === "union" || spec.kind === "variant")
      ) {
        // When the value is *not* already a Schema instance we need to pick
        // the appropriate constructor and validate recursively.
        if (!(val as any)?.__isSchemaInstance) {
          try {
            const ctor = pickCtor(
              val,
              spec.ctors!,
              spec.discriminator?.propertyName ?? "kind",
            );
            const instance = new ctor(val as any) as Schema<any>;
            for (const msg of instance.validate()) {
              errors.push(`${String(key)}.${msg}`);
            }
          } catch (e) {
            errors.push(`${String(key)}: ${(e as Error).message}`);
          }
        }
      }
    }

    return errors;
  }

  /* --------------------------------------------------------------------- */
  /* toJSON
  /* --------------------------------------------------------------------- */

  toJSON(): ValueMap<F> {
    const serialise = (val: unknown): unknown => {
      if (val == null) return val;
      if (typeof val === "bigint") return val.toString();
      if (Array.isArray(val)) return val.map(serialise);
      if (val instanceof Set) return Array.from(val).map(serialise);
      if (val instanceof Map)
        return Object.fromEntries(
          Array.from(val.entries()).map(([k, v]) => [String(k), serialise(v)]),
        );
      if ((val as any)?.__isSchemaInstance)
        return (val as Schema<any>).toJSON();
      if (typeof val === "object") {
        const proto = Object.getPrototypeOf(val);
        if (proto === Object.prototype || proto === null) {
          const obj: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            obj[k] = serialise(v);
          }
          return obj;
        }
      }
      return val;
    };

    const json = {} as ValueMap<F>;
    for (const key in this._fields) {
      const field = this._fields[key];
      const raw = (() => {
        if (field.value == null) return field.value as unknown;

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

      // Apply optional serializer
      const serdes = (field as any).serdes as
        | [(val: unknown) => unknown, (raw: unknown) => unknown]
        | undefined;
      const rendered = (() => {
        if (!serdes) return raw;
        const [serialize] = serdes;
        if (raw == null) return raw;
        if (Array.isArray(raw)) return raw.map(serialize);
        if (raw instanceof Set) return Array.from(raw).map(serialize);
        return serialize(raw);
      })();

      (json as Record<string, unknown>)[key] = serialise(rendered);
    }
    return json;
  }

  /* --------------------------------------------------------------------- */
  /* jsonSchema                                                             */
  /* --------------------------------------------------------------------- */

  static jsonSchema(): Record<string, unknown> {
    const schema = (this as any)._schema as Fields;

    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    const specToSchema = (
      spec: TypedSpec<any> | SchemaClass,
    ): Record<string, unknown> => {
      if (typeof spec === "function") {
        return (spec as unknown as typeof Schema).jsonSchema();
      }

      switch (spec.kind) {
        case "primitive": {
          let typeStr: string;
          if (spec === t.string) typeStr = "string";
          else if (spec === t.number) typeStr = "number";
          else if (spec === t.boolean) typeStr = "boolean";
          else if (spec === t.bigint)
            typeStr = "string"; // encode bigint as string in JSON
          else typeStr = "string"; // fallback
          return { type: typeStr };
        }
        case "literal": {
          const baseType = typeof spec.literal;
          return { type: baseType, const: spec.literal } as Record<
            string,
            unknown
          >;
        }
        case "enum": {
          const values = Object.values(spec.enumObject ?? {});
          const baseType = typeof values[0] === "number" ? "number" : "string";
          return { type: baseType, enum: values } as Record<string, unknown>;
        }
        case "serdes": {
          return specToSchema(spec.rawSpec!);
        }
        case "union": {
          return { oneOf: spec.ctors!.map((C) => (C as any).jsonSchema()) };
        }
        case "variant": {
          return {
            oneOf: spec.ctors!.map((C) => (C as any).jsonSchema()),
            discriminator: {
              propertyName:
                (spec.discriminator?.propertyName as string) ?? "kind",
            },
          };
        }

        case "tuple": {
          return {
            type: "array",
            items: spec.specs!.map((s) => specToSchema(s)),
            minItems: spec.specs!.length,
            maxItems: spec.specs!.length,
          } as Record<string, unknown>;
        }

        case "map": {
          return {
            type: "object",
            additionalProperties: specToSchema(spec.valueSpec!),
            propertyNames: specToSchema(spec.keySpec!),
          } as Record<string, unknown>;
        }
        default:
          return {};
      }
    };

    for (const [key, fieldDef] of Object.entries(schema)) {
      const spec = (fieldDef as any).spec as TypedSpec<any> | SchemaClass;
      const cardinality = (fieldDef as any).cardinality ?? "one";

      let propSchema = specToSchema(spec);

      if (
        cardinality === "array" ||
        cardinality === "set" ||
        cardinality === "many"
      ) {
        propSchema = { type: "array", items: propSchema };
      }

      const desc = (fieldDef as any).description;
      if (desc) propSchema.description = desc;

      if ((fieldDef as any).default !== undefined) {
        const d = (fieldDef as any).default;
        propSchema.default = typeof d === "function" ? d() : d;
      }

      properties[key] = propSchema;

      const optional = (fieldDef as any).optional;
      if (!optional && (fieldDef as any).default === undefined) {
        required.push(key);
      }
    }

    const out: Record<string, unknown> = {
      type: "object",
      properties,
    };
    if (required.length) out.required = required;

    return out;
  }

  /* --------------------------------------------------------------------- */
  /* Static factories                                                       */
  /* --------------------------------------------------------------------- */

  static from<F extends Record<string, FieldType<any>>>(schema: F) {
    const Base = this as unknown as typeof Schema;
    class ModelWithSchema extends Base<F> {
      static _schema = schema;
    }

    return ModelWithSchema as unknown as {
      new (input: InputValueMap<F>): Schema<F> & ValueMap<F>;
      _schema: F;
      jsonSchema(): Record<string, unknown>;
      fromJSON(
        input: unknown,
      ): Result<Schema<F> & ValueMap<F>, ErrLog<Schema<F> & ValueMap<F>>>;
    };
  }

  static fromJSON(
    this: {
      new (input: any): Schema<any> & Fields;
      _schema: Fields;
    },
    input: unknown,
  ): Result<InstanceType<typeof this>, ErrLog<InstanceType<typeof this>>> {
    // Build instance and validate in one go
    const instance = new this(input as any);
    const errs = instance.validate();
    if (!errs.length) return { val: instance, errs: undefined };

    const errLog = {} as Record<string, string | undefined> & {
      summarize(): string[];
    };
    for (const key of Object.keys(this._schema)) errLog[key] = undefined;
    for (const msg of errs) {
      const idx = msg.indexOf(": ");
      if (idx === -1) continue;
      const k = msg.slice(0, idx);
      const m = msg.slice(idx + 2);
      errLog[k] = m;
    }
    errLog.summarize = () => errs.slice();
    return { val: undefined, errs: errLog as any };
  }
}
