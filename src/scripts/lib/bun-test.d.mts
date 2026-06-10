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
}
