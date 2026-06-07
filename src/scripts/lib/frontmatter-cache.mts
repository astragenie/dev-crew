// Process-scoped frontmatter parse cache keyed by (filePath, mtime).
// Prevents re-parsing the same unchanged file within a single CLI invocation.
// Call clearFrontmatterCache() at each top-level command entry to avoid
// stale reads across back-to-back calls in the same process.
//
// Zero deps — pure Map-based LRU alternative. Intentionally simple.

interface CacheEntry {
  mtime: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();

/**
 * Return the parsed frontmatter data for filePath, using the cache when the
 * stored mtime matches the supplied mtime.
 *
 * @param filePath  Absolute path to the file (cache key component).
 * @param mtime     File modification time (mtimeMs from fs.stat).
 * @param parse     Parser function: content → T.
 * @param readFile  File reader: path → content string (synchronous).
 */
export function readFrontmatterCached<T>(
  filePath: string,
  mtime: number,
  parse: (content: string) => T,
  readFile: (path: string) => string
): T {
  const existing = cache.get(filePath);
  if (existing !== undefined && existing.mtime === mtime) {
    return existing.data as T;
  }
  const content = readFile(filePath);
  const data = parse(content);
  cache.set(filePath, { mtime, data });
  return data;
}

/**
 * Clear all cache entries. Call at the start of each top-level command handler
 * in loop.mts to prevent cross-invocation stale reads in long-running processes.
 */
export function clearFrontmatterCache(): void {
  cache.clear();
}
