import { execFileSync } from "node:child_process";

export const defaultGhExec = (args) =>
  execFileSync("gh", args, { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] }).trim();

export function isGhInstalled({ ghExec = defaultGhExec } = {}) {
  try {
    ghExec(["--version"]);
    return true;
  } catch {
    return false;
  }
}

export function ghJson(args, { ghExec = defaultGhExec } = {}) {
  return JSON.parse(ghExec(args));
}
