import { readFileSync } from "node:fs";
import { validatePreset, type PresetV1 } from "./preset-schema.mjs";
import { deepMerge } from "./deep-merge.mjs";

export interface ResolvedSkills {
  variant: "fe" | "be" | "single";
  skills: string[];
  source: "preset.fe" | "preset.be" | "preset.skills";
  dispatchInstructionBlock: string;
}

export interface ResolveArgs {
  presetPath: string;
  overridePath?: string;
  variant: "fe" | "be" | "single";
}

export function resolveSkills(args: ResolveArgs): ResolvedSkills | null {
  const presetRaw = JSON.parse(readFileSync(args.presetPath, "utf8"));
  const overrideRaw = args.overridePath ? readOverride(args.overridePath) : {};
  const merged = deepMerge(presetRaw, overrideRaw);
  const preset: PresetV1 = validatePreset(merged);

  const block = pickBlock(preset, args.variant);
  if (!block) return null;
  if (block.skills.length === 0) return null;

  return {
    variant: args.variant,
    skills: block.skills,
    source: block.source,
    dispatchInstructionBlock: renderDispatchBlock(block.skills)
  };
}

function readOverride(p: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (err: unknown) {
    if (isEnoent(err)) return {};
    throw err;
  }
}

function isEnoent(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "ENOENT";
}

function pickBlock(
  preset: PresetV1,
  variant: ResolveArgs["variant"]
): { skills: string[]; source: ResolvedSkills["source"] } | null {
  if (preset.split && (variant === "fe" || variant === "be")) {
    const block = variant === "fe" ? preset.fe : preset.be;
    if (!block) return null;
    return { skills: block.skills, source: variant === "fe" ? "preset.fe" : "preset.be" };
  }
  if (!preset.split && variant === "single") {
    if (!preset.skills) return null;
    return { skills: preset.skills, source: "preset.skills" };
  }
  return null;
}

export function renderDispatchBlock(skills: string[]): string {
  const bullets = skills.map((s) => `- ${s}`).join("\n");
  return `## Required skills (resolved)\n${bullets}\n`;
}
