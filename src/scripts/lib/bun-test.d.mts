// Type shim for bun:test module — used only for TypeScript type checking
// Runtime execution uses the native bun:test implementation
declare module "bun:test" {
  export const test: typeof import("node:test").test;
  export const describe: typeof import("node:test").describe;
  export const it: typeof import("node:test").it;
  export const beforeAll: typeof import("node:test").before;
  export const afterAll: typeof import("node:test").after;
  export const beforeEach: typeof import("node:test").beforeEach;
  export const afterEach: typeof import("node:test").afterEach;
  export const before: typeof import("node:test").before;
  export const after: typeof import("node:test").after;
  export const skip: typeof import("node:test").skip;
  export const todo: typeof import("node:test").todo;
  /**
   * Permissive `expect` shim — matcher methods are typed as `any` so the
   * shim doesn't have to enumerate every Bun/Jest matcher. Runtime resolves
   * against bun:test, which has the real implementation.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const expect: (actual?: unknown) => any;
}
