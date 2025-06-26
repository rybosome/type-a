import { LogicalConstraint } from "../schema";
import { atLeast, atMost } from "./numeric";

/* -------------------------------------------------------------------------- */
/*  Basic Content Checks                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Ensures a string has at least one character.
 */
export const nonEmpty: LogicalConstraint<string> = (val) =>
  val.length > 0 ? true : "must not be empty";

/**
 * Alias of {@link nonEmpty}.
 */
export const notEmpty = nonEmpty;

/**
 * Ensures the string is empty.
 */
export const empty: LogicalConstraint<string> = (val) =>
  val.length === 0 ? true : "must be empty";

/**
 * Ensures the string consists solely of whitespace (spaces, tabs, newlines).
 * The empty string is considered valid whitespace.
 */
export const whitespace: LogicalConstraint<string> = (val) =>
  val.trim().length === 0 ? true : "must contain only whitespace";

/**
 * val === match
 */
export const equalTo =
  (match: string): LogicalConstraint<string> =>
  (val) =>
    val === match ? true : `must equal ${JSON.stringify(match)}`;

/**
 * val !== match
 */
export const notEqualTo =
  (match: string): LogicalConstraint<string> =>
  (val) =>
    val !== match ? true : `must not equal ${JSON.stringify(match)}`;

/* -------------------------------------------------------------------------- */
/*  Length Constraints                                                        */
/* -------------------------------------------------------------------------- */

/**
 * val.length > n
 */
export const longerThan =
  (n: number): LogicalConstraint<string> =>
  (val) =>
    val.length > n
      ? true
      : `length ${val.length} is not longerThan(${n})`;

/**
 * val.length < n
 */
export const shorterThan =
  (n: number): LogicalConstraint<string> =>
  (val) =>
    val.length < n
      ? true
      : `length ${val.length} is not shorterThan(${n})`;

/**
 * Alias of generic `atLeast`.  val.length ≥ min
 */
export const minLength = atLeast;

/**
 * Alias of generic `atMost`.   val.length ≤ max
 */
export const maxLength = atMost;

/**
 * val.length === n
 */
export const length =
  (n: number): LogicalConstraint<string> =>
  (val) =>
    val.length === n
      ? true
      : `length ${val.length} must be exactly ${n}`;

/**
 * min ≤ val.length ≤ max  (inclusive)
 */
export const lengthBetween =
  (min: number, max: number): LogicalConstraint<string> =>
  (val) => {
    const { length: len } = val;
    return len >= min && len <= max
      ? true
      : `length ${len} is not between(${min}, ${max})`;
  };

/* -------------------------------------------------------------------------- */
/*  Character Set & Encoding                                                  */
/* -------------------------------------------------------------------------- */

/** ASCII (0-127) only */
export const validAscii: LogicalConstraint<string> = (val) =>
  // eslint-disable-next-line no-control-regex
  /^[\x00-\x7F]*$/.test(val) ? true : "must contain only ASCII characters";

/** [A-Z a-z 0-9] one or more */
export const alphanumeric: LogicalConstraint<string> = (val) =>
  /^[A-Za-z0-9]+$/.test(val) ? true : "must be alphanumeric";

/** Letters only */
export const alpha: LogicalConstraint<string> = (val) =>
  /^[A-Za-z]+$/.test(val) ? true : "must contain only alphabetic characters";

/** Digits only */
export const numeric: LogicalConstraint<string> = (val) =>
  /^\d+$/.test(val) ? true : "must contain only numeric characters";

/** Hexadecimal string (upper or lower) */
export const hex: LogicalConstraint<string> = (val) =>
  /^[0-9A-Fa-f]+$/.test(val) ? true : "must be valid hexadecimal";

/** RFC-4648 base-64 encoding */
export const base64: LogicalConstraint<string> = (val) =>
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(val)
    ? true
    : "must be valid base64";

/**
 * RFC-4122 version-4 UUID validator (kept for backwards-compat).
 */
export const aUUID: LogicalConstraint<string> = (val) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val,
  )
    ? true
    : "Invalid UUID";

/** Alias of {@link aUUID}. */
export const uuid = aUUID;

/* -------------------------------------------------------------------------- */
/*  Structural / Format Validators                                            */
/* -------------------------------------------------------------------------- */

/** val matches provided `RegExp` */
export const matching =
  (re: RegExp): LogicalConstraint<string> =>
  (val) =>
    re.test(val) ? true : `must match ${re.toString()}`;

/** val starts with prefix */
export const startingWith =
  (prefix: string): LogicalConstraint<string> =>
  (val) =>
    val.startsWith(prefix) ? true : `must start with "${prefix}"`;

/** val ends with suffix */
export const endingWith =
  (suffix: string): LogicalConstraint<string> =>
  (val) =>
    val.endsWith(suffix) ? true : `must end with "${suffix}"`;

/** val includes substring */
export const containing =
  (substr: string): LogicalConstraint<string> =>
  (val) =>
    val.includes(substr) ? true : `must contain "${substr}"`;

/** val does NOT include substring */
export const notContaining =
  (substr: string): LogicalConstraint<string> =>
  (val) =>
    !val.includes(substr) ? true : `must not contain "${substr}"`;

/** slug (lower-case words separated by single hyphens) */
export const slug: LogicalConstraint<string> = (val) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)
    ? true
    : "must be a valid slug (lower-case, hyphen-separated)";

/** Very lightweight email validator */
export const email: LogicalConstraint<string> = (val) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? true : "must be a valid email";

/** http(s) URL using the WHATWG URL parser */
export const url: LogicalConstraint<string> = (val) => {
  try {
    const u = new URL(val);
    return u.protocol === "http:" || u.protocol === "https:"
      ? true
      : "must be a valid http/https URL";
  } catch {
    return "must be a valid http/https URL";
  }
};

/** Bare domain name (no protocol, path, or port) */
export const domain: LogicalConstraint<string> = (val) =>
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/.test(val)
    ? true
    : "must be a valid domain";

/** IPv4 or (very simple) IPv6 */
export const ipAddress: LogicalConstraint<string> = (val) => {
  // IPv4
  const parts = val.split(".");
  if (
    parts.length === 4 &&
    parts.every(
      (p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255,
    )
  ) {
    return true;
  }

  // Relaxed IPv6 (eight 1–4 digit hex groups)
  if (/^(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i.test(val)) {
    return true;
  }

  return "must be a valid IP address";
};

/** `JSON.parse` succeeds */
export const validJson: LogicalConstraint<string> = (val) => {
  try {
    JSON.parse(val);
    return true;
  } catch {
    return "must be valid JSON";
  }
};

/** ISO-8601 date/time */
export const dateIso: LogicalConstraint<string> = (val) =>
  /^\d{4}-\d{2}-\d{2}(?:[Tt ][\d:.\-+Zz]+)?$/.test(val) &&
  !Number.isNaN(Date.parse(val))
    ? true
    : "must be a valid ISO-8601 date";

/* -------------------------------------------------------------------------- */
/*  Casing & Style Validators                                                 */
/* -------------------------------------------------------------------------- */

/** All lower-case */
export const lowerCase: LogicalConstraint<string> = (val) =>
  val === val.toLowerCase() ? true : "must be lower-case";

/** All upper-case */
export const upperCase: LogicalConstraint<string> = (val) =>
  val === val.toUpperCase() ? true : "must be upper-case";

/** "Title Case" – every word starts with capital, rest lower */
export const titleCase: LogicalConstraint<string> = (val) => {
  const ok = val
    .split(/\s+/)
    .filter(Boolean)
    .every(
      (w) => w[0] === w[0]?.toUpperCase() && w.slice(1) === w.slice(1).toLowerCase(),
    );
  return ok ? true : "must be title-case";
};

/** camelCase */
export const camelCase: LogicalConstraint<string> = (val) =>
  /^[a-z][A-Za-z0-9]*$/.test(val) ? true : "must be camelCase";

/** snake_case */
export const snakeCase: LogicalConstraint<string> = (val) =>
  /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(val) ? true : "must be snake_case";

/** kebab-case */
export const kebabCase: LogicalConstraint<string> = (val) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val) ? true : "must be kebab-case";
