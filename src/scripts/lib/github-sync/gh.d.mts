// Ambient types for the runtime-only gh wrapper at
// scripts/lib/github-sync/gh.mjs.

export const defaultGhExec: (args: string[]) => any;
export function isGhInstalled(opts?: any): boolean;
export function ghJson(args: string[], opts?: any): any;
