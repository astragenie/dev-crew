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
