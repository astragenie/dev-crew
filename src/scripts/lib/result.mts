import { err as stdErr, ok as stdOk, type Result as StdResult } from "@astragenie/plugin-std";

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
// Alias, not a re-export: plugin-std defaults E to PluginError; this repo's
// convention (DEC-002) defaults E to Error, so the default is pinned locally.
export type Result<T, E = Error> = StdResult<T, E>;

// Runtime delegates to plugin-std (byte-identical shape); the narrow Ok<T>/
// Err<E> return type is preserved locally because plugin-std's own ok/err
// signatures return the widened `Result<T, never>` union, which would break
// direct `.value`/`.error` access at call sites (e.g. `ok(42).value`) without
// a type guard.
export function ok<T>(value: T): Ok<T> {
  return stdOk(value) as Ok<T>;
}

export function err<E>(error: E): Err<E> {
  return stdErr(error) as Err<E>;
}

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.ok;
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return !r.ok;
}
