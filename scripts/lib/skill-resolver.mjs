import { readFileSync } from "node:fs";
import { validatePreset, VALID_ROLES } from "./preset-schema.mjs";
import { deepMerge } from "./deep-merge.mjs";
export function isRoleVariant(v) {
    return VALID_ROLES.includes(v);
}
export function resolveSkills(args) {
    const presetRaw = JSON.parse(readFileSync(args.presetPath, "utf8"));
    const overrideRaw = args.overridePath ? readOverride(args.overridePath) : {};
    const merged = deepMerge(presetRaw, overrideRaw);
    const preset = validatePreset(merged);
    const block = pickBlock(preset, args.variant);
    if (!block)
        return null;
    if (block.skills.length === 0)
        return null;
    return {
        variant: args.variant,
        skills: block.skills,
        source: block.source,
        dispatchInstructionBlock: renderDispatchBlock(block.skills)
    };
}
function readOverride(p) {
    try {
        return JSON.parse(readFileSync(p, "utf8"));
    }
    catch (err) {
        if (isEnoent(err))
            return {};
        throw err;
    }
}
function isEnoent(err) {
    return typeof err === "object" && err !== null && err.code === "ENOENT";
}
function pickBlock(preset, variant) {
    if (isRoleVariant(variant)) {
        const block = preset.roles?.[variant];
        if (!block)
            return null;
        return { skills: block.skills, source: `preset.roles.${variant}` };
    }
    if (preset.split && (variant === "fe" || variant === "be")) {
        const block = variant === "fe" ? preset.fe : preset.be;
        if (!block)
            return null;
        return { skills: block.skills, source: variant === "fe" ? "preset.fe" : "preset.be" };
    }
    if (!preset.split && variant === "single") {
        if (!preset.skills)
            return null;
        return { skills: preset.skills, source: "preset.skills" };
    }
    return null;
}
export function renderDispatchBlock(skills) {
    const bullets = skills.map((s) => `- ${s}`).join("\n");
    return `## Required skills (resolved)\n${bullets}\n`;
}
