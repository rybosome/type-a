"use strict";
/**
 * Generic result helper types.
 *
 *  Result - discriminated union carrying either a valid value (`val`) or an
 *           error container (`errs`). Exactly one of the two is defined.
 *  ErrLog - per-field error map (`string | undefined`) with a `summarize`
 *           helper returning all collected error strings.
 *  Maybe  - convenience alias: `Result<T, ErrLog<T>>`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
