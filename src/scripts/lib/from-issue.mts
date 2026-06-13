// from-issue.mts — fetch GitHub issue metadata via `gh issue view`
// Used by backlog-add --from-issue <url> to pre-fill FEAT frontmatter.

import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

export interface IssueFields {
  title: string;
  body: string;
  number: number;
  url: string;
}

/**
 * Options for `fetchIssue`. Exposed primarily for testing — callers can
 * inject a custom executor to avoid spawning a real `gh` process.
 */
export interface FetchIssueOptions {
  /** Override the executor (default: `execFile("gh", ...)`) */
  exec?: (args: string[]) => Promise<string>;
}

/**
 * Parse a GitHub issue URL and return the canonical form expected by `gh`.
 * Accepts both HTTPS URLs and short `owner/repo#number` shorthands.
 */
export function parseIssueUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("--from-issue: issue URL must not be empty.");
  return trimmed.replace(/#.*$/, "");
}

/**
 * Fetch issue metadata from GitHub via the `gh` CLI.
 *
 * Throws with a human-readable message when:
 * - `gh` is not on PATH (ENOENT)
 * - `gh issue view` exits non-zero (e.g. private/inaccessible issue)
 * - the JSON response cannot be parsed
 */
export async function fetchIssue(
  issueUrl: string,
  options: FetchIssueOptions = {}
): Promise<IssueFields> {
  const url = parseIssueUrl(issueUrl);

  const defaultExec = async (args: string[]): Promise<string> => {
    const { stdout } = await execFile("gh", args, { encoding: "utf8" });
    return stdout;
  };

  const rawExec = options.exec ?? defaultExec;

  let raw: string;
  try {
    raw = await rawExec(["issue", "view", url, "--json", "title,body,number,url"]);
  } catch (err: unknown) {
    const nodeErr = err as { code?: string; stderr?: string; message?: string };
    if (nodeErr.code === "ENOENT") {
      throw new Error(
        "--from-issue requires the GitHub CLI (`gh`) to be installed and on PATH. " +
          "Install from https://cli.github.com/ and run `gh auth login`."
      );
    }
    const stderr = (nodeErr.stderr ?? "").trim();
    throw new Error(
      `--from-issue: \`gh issue view\` failed (exit non-zero).` +
        (stderr ? `\n  gh error: ${stderr}` : "") +
        "\n  Ensure the issue URL is correct and that you have access to the repo."
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `--from-issue: could not parse JSON from \`gh issue view\`. Raw output:\n${raw}`
    );
  }

  const data = parsed as Record<string, unknown>;
  if (
    typeof data.title !== "string" ||
    typeof data.number !== "number" ||
    typeof data.url !== "string"
  ) {
    throw new Error(
      `--from-issue: unexpected JSON shape from \`gh issue view\`. ` +
        `Expected {title, body, number, url}. Got: ${JSON.stringify(data)}`
    );
  }

  return {
    title: data.title,
    body: typeof data.body === "string" ? data.body : "",
    number: data.number,
    url: data.url
  };
}
