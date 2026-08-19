// Memory doctor renderer (runner-plugin#292).
//
// Formats a MemoryStatus into a Markdown block suitable for devcrew:brief output.
// Pure function — no I/O, no side effects.

import type { MemoryStatus } from "./memory-doctor.mjs";

/**
 * Render a MemoryStatus as a Markdown block starting with `## Memory layer`.
 * Covers all health variants: ok, cli_missing, unreachable, not_configured,
 * unknown, disabled — the latter three share the fix-hint layout.
 */
export function renderMemoryStatusBlock(status: MemoryStatus): string {
  const lines: string[] = ["## Memory layer", ""];

  switch (status.health) {
    case "ok":
      renderOk(status, lines);
      break;
    case "cli_missing":
      renderCliMissing(lines);
      break;
    case "unreachable":
    case "not_configured":
    case "unknown":
      renderUnreachable(status, lines);
      break;
    case "disabled":
      renderDisabled(lines);
      break;
    default: {
      // Exhaustive fallback — surface raw health value.
      const _exhaustive: never = status.health;
      lines.push(`Status: ${_exhaustive}`);
      break;
    }
  }

  lines.push("");
  return lines.join("\n");
}

function renderOk(status: MemoryStatus, lines: string[]): void {
  lines.push("**Status:** ok");
  if (status.cli_path) lines.push(`**CLI:** \`${status.cli_path}\``);
  if (status.provider) lines.push(`**Provider:** ${status.provider}`);
  if (status.version) lines.push(`**Version:** ${status.version}`);
  if (status.url) lines.push(`**URL:** ${status.url}`);
  if (status.last_ingest_at) lines.push(`**Last ingest:** ${status.last_ingest_at}`);
}

function renderCliMissing(lines: string[]): void {
  lines.push("**Status:** dormant — bridge activates when memory-plugin v0.4 ships astramem CLI");
  lines.push("");
  lines.push('To suppress this block: set `loop.memory.enabled = "never"` in `.claude/loop.json`.');
}

function renderUnreachable(status: MemoryStatus, lines: string[]): void {
  lines.push(`**Status:** ${status.health}`);
  if (status.cli_path) lines.push(`**CLI:** \`${status.cli_path}\``);
  if (status.version) lines.push(`**Version:** ${status.version}`);
  if (status.provider) lines.push(`**Provider:** ${status.provider}`);
  if (status.error) lines.push(`**Error:** ${status.error}`);
  lines.push("");
  lines.push("**Fix hints:**");
  lines.push("- Run `astramem doctor` for a full diagnostic.");
  lines.push("- Run `astramem config set provider saas` to switch to the hosted provider.");
  if (status.fix_hint) lines.push(`- ${status.fix_hint}`);
}

function renderDisabled(lines: string[]): void {
  lines.push('**Status:** disabled (`loop.memory.enabled = "never"`)');
}
