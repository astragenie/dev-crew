// Parallel phase-gate runner. Runs N named groups concurrently — each group
// is a serial list of commands that fails-fast within the group on first
// non-zero exit. The overall run returns the first failing group's exit code.
//
// Output from all groups is interleaved into one combined log, with each line
// prefixed by `[<group>] ` so the parent agent can grep for which group
// produced what. No artifact writing here — the caller (phase-gate.mts) keeps
// owning the markdown report + crew handoff.

import { spawn } from "node:child_process";

export type Command = { cmd: string; args?: string[]; cwd?: string };
export type Groups = Record<string, Command[]>;

export type GroupResult = {
  group: string;
  exitCode: number;
  durationMs: number;
};

export type RunResult = {
  exitCode: number;
  failedGroup: string | null;
  groups: GroupResult[];
  combinedLog: string;
};

function runCommand(group: string, cmd: Command, sink: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(cmd.cmd, cmd.args || [], {
      cwd: cmd.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });
    const tag = `[${group}] `;
    const emit = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      for (const line of text.split(/\r?\n/)) {
        if (line) sink.push(tag + line);
      }
    };
    child.stdout.on("data", emit);
    child.stderr.on("data", emit);
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", (err) => {
      sink.push(`${tag}spawn-error: ${err.message}`);
      resolve(1);
    });
  });
}

async function runGroup(group: string, commands: Command[], sink: string[]): Promise<GroupResult> {
  const t0 = Date.now();
  let exit = 0;
  for (const cmd of commands) {
    exit = await runCommand(group, cmd, sink);
    if (exit !== 0) break;
  }
  return { group, exitCode: exit, durationMs: Date.now() - t0 };
}

export async function runParallelGroups(
  groups: Groups,
  { only }: { only?: string } = {}
): Promise<RunResult> {
  const sink: string[] = [];
  const entries = Object.entries(groups).filter(([name]) => !only || name === only);
  const settled = await Promise.all(entries.map(([name, cmds]) => runGroup(name, cmds, sink)));
  const failed = settled.find((g) => g.exitCode !== 0) || null;
  return {
    exitCode: failed ? failed.exitCode : 0,
    failedGroup: failed ? failed.group : null,
    groups: settled,
    combinedLog: sink.join("\n")
  };
}
