// Process-scoped in-memory cache. Lives only for the duration of one Node.js
// process. Does NOT persist across subagent boundaries — each subagent starts
// with an empty store. Useful for loop.mjs CLI commands (list, status) that
// make repeated calls within one invocation. Not useful for multi-agent flows.
const _store = new Map();

export function cached(key, asyncFn) {
  if (_store.has(key)) return _store.get(key);
  const promise = asyncFn();
  _store.set(key, promise);
  return promise;
}

export function bust(key) {
  _store.delete(key);
}

export function clearAll() {
  _store.clear();
}
