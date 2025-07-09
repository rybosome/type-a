import { defaultRegistry } from "@src/registry";
/**
 * Recursively instantiate nested schema values.
 */
export function instantiateNestedSchemas(value, schemaClass) {
    console.error("instantiateNestedSchemas called with:", value);
    if (Array.isArray(value)) {
        const result = value.map((v) => {
            const instance = v instanceof schemaClass ? v : new schemaClass(v);
            console.error(" → instantiating array item:", v, "→", instance);
            return instance;
        });
        return result;
    }
    if (value instanceof schemaClass) {
        console.error(" → already instance of schemaClass:", value);
        return value;
    }
    if (typeof value === "object" && value !== null) {
        const instance = new schemaClass(value);
        console.error(" → instantiated object:", value, "→", instance);
        return instance;
    }
    console.error(" → returned unchanged:", value);
    return value;
}
/* ------------------------------------------------------------------ */
/* Default primitive validators                                        */
/* ------------------------------------------------------------------ */
/**
 * Built-in primitive validators automatically applied to any field that has
 * **no** nested `schemaClass` / `variantClasses` **and** no user-supplied
 * `is` predicate.  The table keys are raw JavaScript `typeof` strings or
 * special sentinels for complex objects (`array`, `date`, `object`).
 */
const DEFAULT_VALIDATORS = {
    boolean: (v) => typeof v === "boolean" || "expected boolean", // primitive boolean
    number: (v) => (typeof v === "number" && Number.isFinite(v)) || "expected finite number",
    string: (v) => typeof v === "string" || "expected string",
    // bigint & date left out for now – user may supply custom validators
    array: (v) => Array.isArray(v) || "expected array",
    object: (v) => (v !== null && typeof v === "object" && !Array.isArray(v)) ||
        "expected plain object",
};
export function Of(...args) {
    /* -------------------------------------------------------------- */
    /* Detect argument pattern                                        */
    /* -------------------------------------------------------------- */
    // Helpers -------------------------------------------------------
    const makeField = (extra, opts) => {
        const base = {
            // phantom compile-time marker
            __t: undefined,
            value: undefined,
            ...extra,
        };
        if (opts?.is)
            base.is = opts.is;
        if (opts && "default" in opts && opts.default !== undefined) {
            base.default = opts.default;
        }
        if (opts && "serdes" in opts && opts.serdes !== undefined) {
            base.serdes = opts.serdes;
        }
        return base;
    };
    // Variant union support: opts object with `variantClasses` key.
    if (args.length === 1 &&
        args[0] &&
        typeof args[0] === "object" &&
        !Array.isArray(args[0]) &&
        Array.isArray(args[0].variantClasses)) {
        const optsObj = args[0];
        const { variantClasses, ...rest } = optsObj;
        // Validate variantClasses shape at runtime for helpful errors.
        if (variantClasses.length === 0 ||
            !variantClasses.every((c) => typeof c === "function" && "_schema" in c)) {
            throw new Error("Of(): `variantClasses` must be an array of Schema classes with static _schema");
        }
        return makeField({
            variantClasses,
        }, rest);
    }
    const opts = (args[0] ?? undefined);
    const base = {
        __t: undefined,
        value: undefined,
    };
    if (opts?.is)
        base.is = opts.is;
    if (opts && "default" in opts && opts.default !== undefined) {
        base.default = opts.default;
    }
    if (opts && "serdes" in opts && opts.serdes !== undefined) {
        base.serdes = opts.serdes;
    }
    return base;
}
// --------------------
// Schema
// --------------------
/**
 * Combine several constraints into one.  Runs each in sequence and returns the
 * first non-`true` result (an error string) or `true` when all pass.
 */
function composeConstraints(constraints) {
    return (val) => {
        for (const c of constraints) {
            const res = c(val);
            if (res !== true)
                return res;
        }
        return true;
    };
}
/**
 * A dataclass-style object with parsing, validation and rendering.
 */
export class Schema {
    constructor(input) {
        this.__isSchemaInstance = true;
        const schema = this.constructor._schema;
        const fields = {};
        for (const [key, fieldDef] of Object.entries(schema)) {
            if (!fieldDef.schemaClass && "__t" in fieldDef) {
                const rawT = fieldDef.__t;
                const maybeInstance = Array.isArray(rawT) ? rawT[0] : rawT;
                if (maybeInstance &&
                    typeof maybeInstance === "object" &&
                    maybeInstance.constructor?._schema) {
                    fieldDef.schemaClass = maybeInstance.constructor;
                    console.error(`✅ schemaClass inferred for field '${String(key)}':`, maybeInstance.constructor.name);
                }
            }
            const supplied = input[key];
            const def = fieldDef.default;
            const rawValue = supplied !== undefined
                ? supplied
                : typeof def === "function"
                    ? def()
                    : def;
            /* ----------------------------------------------- */
            /* Apply custom deserialiser (raw -> in-memory)    */
            /* ----------------------------------------------- */
            const deserialised = (() => {
                if (!fieldDef.serdes)
                    return rawValue;
                const [, deserialize] = fieldDef.serdes;
                // Only transform when value is non-nullish – keep null/undefined as-is.
                if (rawValue === null || rawValue === undefined)
                    return rawValue;
                return deserialize(rawValue);
            })();
            // Handle nested Schema instantiation when necessary
            const nestedValue = (() => {
                const singleCtor = fieldDef.schemaClass;
                const ctorSet = fieldDef.variantClasses;
                if ((!singleCtor && !ctorSet) ||
                    deserialised === undefined ||
                    deserialised === null) {
                    return deserialised;
                }
                // Helper to pick constructor for discriminated unions ----------------
                const pickCtor = (raw) => {
                    if (singleCtor)
                        return singleCtor;
                    if (!ctorSet)
                        return undefined;
                    // Simple heuristic: use `kind` discriminator when present.
                    const discriminator = raw?.kind;
                    if (discriminator != null) {
                        const match = ctorSet.find((C) => {
                            try {
                                // Attempt cheap prototype check first – avoids full instantiation.
                                const schema = C._schema;
                                if (schema &&
                                    Object.prototype.hasOwnProperty.call(schema, "kind") &&
                                    // access default or literal value if present
                                    schema.kind.default === discriminator)
                                    return true;
                            }
                            catch {
                                /* noop */
                            }
                            return false;
                        });
                        if (match)
                            return match;
                    }
                    // Fallback heuristic ------------------------------------------------
                    // Choose the constructor whose declared schema keys overlap the most
                    // with the raw object's keys.  This is a simple, deterministic
                    // approach that works well for typical discriminated unions where
                    // each subtype has unique fields.
                    if (raw && typeof raw === "object") {
                        const rawKeys = new Set(Object.keys(raw));
                        let best;
                        let bestScore = -1;
                        for (const C of ctorSet) {
                            const keys = Object.keys(C._schema);
                            let score = 0;
                            for (const k of keys)
                                if (rawKeys.has(k))
                                    score += 1;
                            if (score > bestScore) {
                                bestScore = score;
                                best = C;
                            }
                        }
                        if (best)
                            return best;
                    }
                    // As a final fallback, just use the first constructor.
                    return ctorSet[0];
                };
                const convert = (val) => {
                    const Ctor = pickCtor(val);
                    if (!Ctor)
                        return val; // give up – leave raw
                    return val instanceof Ctor ? val : new Ctor(val);
                };
                // Array-of-schema support
                if (Array.isArray(deserialised)) {
                    return deserialised.map(convert);
                }
                return convert(deserialised);
            })();
            // nestedValue already computed above; re-use here
            if (fieldDef.schemaClass) {
                console.error(`[${String(key)}] nestedValue:`, nestedValue);
                console.error(`[${String(key)}] is instance of schemaClass?`, nestedValue instanceof fieldDef.schemaClass);
            }
            const field = {
                value: nestedValue,
                is: (() => {
                    const rawIs = fieldDef.is;
                    if (Array.isArray(rawIs)) {
                        return rawIs.length > 0 ? composeConstraints(rawIs) : undefined;
                    }
                    if (rawIs)
                        return rawIs;
                    /* ---------------------------------------------------- */
                    /* Fallback to built-in primitive validators            */
                    /* ---------------------------------------------------- */
                    if (!fieldDef.schemaClass && !fieldDef.variantClasses) {
                        const pick = (val) => {
                            const t = typeof val;
                            if (t === "object") {
                                // date validator not yet built-in
                                if (Array.isArray(val))
                                    return DEFAULT_VALIDATORS.array;
                                return DEFAULT_VALIDATORS.object;
                            }
                            return DEFAULT_VALIDATORS[t];
                        };
                        // Determine based on *runtime value* (after deserialisation) or default sentinel "undefined".
                        const validator = pick(deserialised);
                        return validator;
                    }
                    return undefined;
                })(),
                default: fieldDef.default,
                ...(fieldDef.serdes ? { serdes: fieldDef.serdes } : {}),
                ...(fieldDef.schemaClass ? { schemaClass: fieldDef.schemaClass } : {}),
            };
            fields[key] = field;
            Object.defineProperty(this, key, {
                get: () => field.value,
                set: (val) => {
                    field.value = val;
                },
                enumerable: true,
            });
        }
        this._fields = fields;
    }
    static from(schema, opts) {
        const registry = opts?.registry ?? defaultRegistry;
        class ModelWithSchema extends Schema {
        }
        ModelWithSchema._schema = schema;
        ModelWithSchema.__registry = registry;
        /* -------------------------------------------------------- */
        /* Populate registry with parent-driven relationships       */
        /* -------------------------------------------------------- */
        for (const [fieldName, fieldDef] of Object.entries(schema)) {
            const rel = fieldDef.relation;
            if (!rel)
                continue;
            let map = registry.get(ModelWithSchema);
            if (!map) {
                map = new Map();
                registry.set(ModelWithSchema, map);
            }
            if (rel.cardinality === "many") {
                map.set(fieldName, [rel.schemaClass]);
            }
            else {
                map.set(fieldName, rel.schemaClass);
            }
        }
        return ModelWithSchema;
    }
    /**
     * Static constructor with built-in validation and aggregated error
     * reporting.
     */
    static tryNew(input) {
        const instance = new this(input);
        const validationErrors = instance.validate();
        if (validationErrors.length === 0) {
            // success path
            return { val: instance, errs: undefined };
        }
        // failure path – build ErrLog with undefined for each field first
        const errLog = Object.keys(this._schema).reduce((acc, key) => {
            acc[key] = undefined;
            return acc;
        }, {});
        // populate messages parsed from "<key>: <message>" strings
        for (const raw of validationErrors) {
            const idx = raw.indexOf(": ");
            if (idx !== -1) {
                const key = raw.slice(0, idx);
                const msg = raw.slice(idx + 2);
                errLog[key] = msg;
            }
        }
        errLog.summarize = () => validationErrors.slice();
        return { val: undefined, errs: errLog };
    }
    validate() {
        const schema = this.constructor._schema;
        const errors = [];
        for (const key in schema) {
            const field = this._fields[key];
            /* ---------------------------------------------------------- */
            /* Recurse into nested Schemas                                */
            /* ---------------------------------------------------------- */
            if (field.value != null) {
                const pushNestedErrors = (item, prefix) => {
                    const nestedErrors = item.validate();
                    for (const msg of nestedErrors)
                        errors.push(`${prefix}.${msg}`);
                };
                if (Array.isArray(field.value)) {
                    field.value.forEach((item, idx) => {
                        if (item?.__isSchemaInstance) {
                            pushNestedErrors(item, `${key}[${idx}]`);
                        }
                    });
                }
                else if (field.value?.__isSchemaInstance) {
                    pushNestedErrors(field.value, String(key));
                }
            }
            // Cast `is` so we have a stable, callable signature
            const is = field.is;
            if (is && field.value !== undefined && field.value !== null) {
                // Apply validator differently for array vs single value
                if (Array.isArray(field.value)) {
                    field.value.forEach((item, idx) => {
                        const res = is(item);
                        if (res !== true)
                            errors.push(`${key}[${idx}]: ${res}`);
                    });
                }
                else {
                    const result = is(field.value);
                    if (result !== true)
                        errors.push(`${key}: ${result}`);
                }
            }
        }
        return errors;
    }
    toJSON() {
        /**
         * Recursively serialise a runtime value so that the result is fully
         * JSON-compatible (plain objects, arrays and primitives only).  Schema
         * instances invoke their own `toJSON()` method; `Map` instances are
         * converted to plain objects via `Object.fromEntries()` while their values
         * are serialised recursively.
         */
        const serialise = (val) => {
            if (val == null)
                return val;
            /* -------------------------------------------------- */
            /* Primitive BigInt handling                          */
            /* -------------------------------------------------- */
            // Native `JSON.stringify` throws on BigInt values.  Convert to a
            // string representation so callers can safely serialise the output
            // produced by `Schema#toJSON()` without additional hooks.
            if (typeof val === "bigint")
                return val.toString();
            if (Array.isArray(val))
                return val.map(serialise);
            if (val instanceof Map) {
                const obj = {};
                for (const [k, v] of val.entries()) {
                    // Convert key to string for use as an object property
                    const key = String(k);
                    // Guard against collisions such as 1 vs "1" or true vs "true"
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        throw new Error(`Duplicate key after stringification: ${String(k)}`);
                    }
                    obj[key] = serialise(v);
                }
                return obj;
            }
            if (typeof val === "object") {
                // Preserve run-time identity for `Schema` instances – they manage their own serialisation.
                if (val.__isSchemaInstance) {
                    return val.toJSON();
                }
                /* ------------------------------------------------------ */
                /* Plain-object (Record) detection                         */
                /* ------------------------------------------------------ */
                const proto = Object.getPrototypeOf(val);
                if (proto === Object.prototype || proto === null) {
                    const obj = {};
                    for (const [k, v] of Object.entries(val)) {
                        obj[k] = serialise(v);
                    }
                    return obj;
                }
                // Exotic objects (Date, RegExp, custom classes, etc.) – return as-is so callers can decide.
                return val;
            }
            return val; // primitive scalar
        };
        const json = {};
        for (const key in this._fields) {
            const field = this._fields[key];
            const raw = (() => {
                if (field.value == null)
                    return field.value;
                if (Array.isArray(field.value)) {
                    return field.value.map((v) => v?.__isSchemaInstance ? v.toJSON() : v);
                }
                return field.value?.__isSchemaInstance
                    ? field.value.toJSON()
                    : field.value;
            })();
            // Apply custom serialiser when supplied (in-memory -> raw)
            const rendered = (() => {
                if (!field.serdes)
                    return raw;
                const [serialize] = field.serdes;
                if (raw == null)
                    return raw;
                if (Array.isArray(raw))
                    return raw.map(serialize);
                return serialize(raw);
            })();
            // Recursively serialise (handles Map & nested objects)
            json[key] = serialise(rendered);
        }
        return json;
    }
    /* ---------------------------------------------------------- */
    /* Registry helpers                                           */
    /* ---------------------------------------------------------- */
    /**
     * Register the calling Schema class as the element type of an **array**
     * field on a parent Schema.  Currently this helper is an identity function
     * that returns the constructor so it can be used inline as a value argument
     * to {@link Of}.  A future release may attach richer runtime metadata.
     */
    static nestedArray(_parentFn, _opts) {
        void _parentFn;
        void _opts;
        return this;
    }
    /**
     * Register the calling Schema class as a **variant** constructor on a parent
     * Schema.  Identity function for now – behaviour mirrors {@link nestedArray}.
     */
    static nestedVariant(_parentFn, _opts) {
        void _parentFn;
        void _opts;
        return this;
    }
}
