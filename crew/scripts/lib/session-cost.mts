import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
// FEAT-025: static JSON import so a bundler (dist/crew.js) inlines the
// pricing table instead of resolving a sibling file via import.meta.url --
// the latter broke on any profile path containing a space and had no
// fallback once bundled (session-cost.mts:21-23 bug, audit #16/#17).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import inlinedPricing from "./pricing.json" with { type: "json" };
import {
  scanSessions,
  percentile,
  readJsonlLines,
  getProjectsRoot
} from "./session-cost-scanner.mjs";
import { getCachedDirFiles } from "./dir-cache.mjs";

export function slugifyRepoPath(repoPath: string): string {
  return repoPath.replace(/[^A-Za-z0-9]/g, "-");
}

interface ModelRates {
  input: number;
  output: number;
  cache_read: number;
  cache_create_5m: number;
  cache_create_1h: number;
  source?: string;
}

interface Pricing {
  fallback: string;
  models: Record<string, ModelRates>;
}

// FEAT-025: PRICING_PATH is read HERE (at call time), not at module load --
// lets tests point at an alternate table (e.g. a temp dir whose path
// contains a space) without needing module-mock machinery. No env var set ->
// the statically-imported inlined table is used with zero filesystem reads
// (AC-3).
function loadPricingTable(): Pricing {
  const override = process.env["PRICING_PATH"];
  if (override) {
    const raw = readFileSync(override, "utf8");
    return JSON.parse(raw) as Pricing;
  }
  return inlinedPricing as unknown as Pricing;
}

// Back-compat named export some callers/tests may still resolve by name.
export async function loadPricing(): Promise<Pricing> {
  return loadPricingTable();
}

export interface PriceForResult {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  /** The exact pricing.json key that matched, or null when unmatched. */
  matched: string | null;
}

// FEAT-025: exact match, or exact-key + "-YYYYMMDD" date-suffix match. No
// more bare-prefix matching (the bug: claude-opus-4-9 silently priced as
// claude-opus-4 / unknown models silently fell back to Sonnet-4 rates).
// Unmatched models now return matched: null instead of a fallback rate.
function matchPricingKey(model: string, models: Record<string, ModelRates>): string | null {
  if (!model) return null;
  if (models[model]) return model;
  const dateSuffixed = /^(.+)-\d{8}$/.exec(model);
  if (dateSuffixed) {
    const base = dateSuffixed[1] as string;
    if (models[base]) return base;
  }
  return null;
}

export function priceFor(model: string): PriceForResult {
  const table = loadPricingTable();
  const matched = matchPricingKey(model, table.models);
  const rates = matched ? table.models[matched] : undefined;
  return {
    input: rates?.input ?? 0,
    output: rates?.output ?? 0,
    cacheRead: rates?.cache_read ?? 0,
    cacheWrite5m: rates?.cache_create_5m ?? 0,
    cacheWrite1h: rates?.cache_create_1h ?? 0,
    matched
  };
}

function ratesAsTokenKeys(rates: PriceForResult): Record<string, number> {
  return {
    input: rates.input,
    output: rates.output,
    cache_read: rates.cacheRead,
    cache_create_5m: rates.cacheWrite5m,
    cache_create_1h: rates.cacheWrite1h
  };
}

function priceTokens(tokens: Record<string, number>, modelRates: Record<string, number>): number {
  let usd = 0;
  for (const k of Object.keys(tokens)) {
    const rate = modelRates[k] ?? 0;
    usd += ((tokens[k] ?? 0) * rate) / 1_000_000;
  }
  return usd;
}

async function listProjectSessions(
  repoPath: string,
  sourceProjectSlug: string | null = null
): Promise<string[]> {
  const slug = sourceProjectSlug ?? slugifyRepoPath(repoPath);
  const dir = path.join(getProjectsRoot(), slug);
  return getCachedDirFiles(dir, (name: string) => name.endsWith(".jsonl")) as Promise<string[]>;
}

async function listJsonlInDir(dir: string): Promise<string[]> {
  try {
    return (await fs.readdir(dir)).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return [];
  }
}

async function listProjectDirEntries(): Promise<string[]> {
  try {
    const entries = await fs.readdir(getProjectsRoot(), { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

function isAssistantTurnInWindow(
  obj: { type?: string; timestamp?: string; message?: { usage?: unknown } } | null | undefined,
  startMs: number,
  endMs: number
): boolean {
  if (obj?.type !== "assistant") return false;
  if (!obj?.message?.usage) return false;
  const tsMs = obj.timestamp ? Date.parse(obj.timestamp) : NaN;
  if (Number.isNaN(tsMs)) return false;
  return tsMs >= startMs && tsMs <= endMs;
}

async function countInWindowAssistantTurns(
  dir: string,
  startMs: number,
  endMs: number
): Promise<number> {
  const files = await listJsonlInDir(dir);
  let count = 0;
  for (const f of files) {
    const full = path.join(dir, f);
    for await (const obj of readJsonlLines(full)) {
      if (isAssistantTurnInWindow(obj, startMs, endMs)) count += 1;
    }
  }
  return count;
}

export async function autoDetectSourceProject({
  startedAt,
  completedAt
}: {
  startedAt?: string;
  completedAt?: string;
} = {}): Promise<string | null> {
  if (!startedAt) return null;
  const endIso = completedAt ?? new Date().toISOString();
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;

  const slugs = await listProjectDirEntries();
  let best: { slug: string; count: number } | null = null;
  for (const slug of slugs) {
    const count = await countInWindowAssistantTurns(
      path.join(getProjectsRoot(), slug),
      startMs,
      endMs
    );
    if (count > 0 && (best == null || count > best.count)) {
      best = { slug, count };
    }
  }
  return best ? best.slug : null;
}

async function listActiveProjectDirs({
  startMs,
  endMs
}: {
  startMs: number;
  endMs: number;
}): Promise<Array<{ slug: string; dir: string }>> {
  const slugs = await listProjectDirEntries();
  const active: Array<{ slug: string; dir: string }> = [];
  for (const slug of slugs) {
    const dir = path.join(getProjectsRoot(), slug);
    const count = await countInWindowAssistantTurns(dir, startMs, endMs);
    if (count > 0) active.push({ slug, dir });
  }
  return active;
}

async function sessionsHaveInWindowAssistantTurns(
  files: string[],
  startMs: number,
  endMs: number
): Promise<boolean> {
  for (const file of files) {
    for await (const obj of readJsonlLines(file)) {
      if (isAssistantTurnInWindow(obj, startMs, endMs)) return true;
    }
  }
  return false;
}

interface ResolveScanSourcesInput {
  aggregateAll: boolean;
  sourceProject: string | null;
  autoDetect: boolean;
  repoPath: string;
  startedAt: string;
  endIso: string;
  startMs: number;
  endMs: number;
}

interface ResolvedScanSources {
  sessionsBySource: Map<string, string[]>;
  effectiveSlug: string;
  autoDetected: boolean;
}

async function resolveAggregateAll(startMs: number, endMs: number): Promise<Map<string, string[]>> {
  const sessionsBySource = new Map<string, string[]>();
  const active = await listActiveProjectDirs({ startMs, endMs });
  for (const { slug, dir } of active) {
    const files = (await fs.readdir(dir))
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => path.join(dir, f));
    sessionsBySource.set(slug, files);
  }
  return sessionsBySource;
}

async function resolveSingleSource(
  repoPath: string,
  sourceProject: string | null,
  autoDetect: boolean,
  startedAt: string,
  endIso: string,
  startMs: number,
  endMs: number
): Promise<{
  sessionsBySource: Map<string, string[]>;
  effectiveSlug: string;
  autoDetected: boolean;
}> {
  let effectiveSlug = sourceProject ?? slugifyRepoPath(repoPath);
  let autoDetected = false;
  let initialFiles = await listProjectSessions(repoPath, effectiveSlug);
  if (!sourceProject && autoDetect) {
    const hasActivity = await sessionsHaveInWindowAssistantTurns(initialFiles, startMs, endMs);
    if (!hasActivity) {
      const detected = await autoDetectSourceProject({ startedAt, completedAt: endIso });
      if (detected && detected !== effectiveSlug) {
        effectiveSlug = detected;
        initialFiles = await listProjectSessions(repoPath, effectiveSlug);
        autoDetected = true;
      }
    }
  }
  const sessionsBySource = new Map<string, string[]>();
  sessionsBySource.set(effectiveSlug, initialFiles);
  return { sessionsBySource, effectiveSlug, autoDetected };
}

async function resolveScanSources({
  aggregateAll,
  sourceProject,
  autoDetect,
  repoPath,
  startedAt,
  endIso,
  startMs,
  endMs
}: ResolveScanSourcesInput): Promise<ResolvedScanSources> {
  if (aggregateAll) {
    const sessionsBySource = await resolveAggregateAll(startMs, endMs);
    return { sessionsBySource, effectiveSlug: "aggregate", autoDetected: false };
  }
  return resolveSingleSource(
    repoPath,
    sourceProject,
    autoDetect,
    startedAt,
    endIso,
    startMs,
    endMs
  );
}

type ByModel = Record<
  string,
  { tokens: Record<string, number>; usd: number; messages: number; pricedAs?: string | null }
>;

// FEAT-025: returns unpricedModels alongside totalUsd so the caller can
// surface them in the cost-report frontmatter + flip the cost-advisor
// verdict to "unknown" (AC-2) instead of silently blending in a fallback
// rate for a model this table has never seen.
function priceByModel(byModel: ByModel): { totalUsd: number; unpricedModels: string[] } {
  let totalUsd = 0;
  const unpriced = new Set<string>();
  for (const model of Object.keys(byModel)) {
    const entry = byModel[model];
    if (entry == null) continue;
    const rates = priceFor(model);
    const usd = priceTokens(entry.tokens, ratesAsTokenKeys(rates));
    entry.usd = Number(usd.toFixed(4));
    entry.pricedAs = rates.matched;
    if (rates.matched == null) unpriced.add(model);
    totalUsd += usd;
  }
  return { totalUsd, unpricedModels: [...unpriced] };
}

type PerSourceState = Map<
  string,
  {
    messages: number;
    tokens: Record<string, number>;
    modelTokens: Record<string, Record<string, number>>;
    touched: boolean;
  }
>;

interface SourceBreakdownEntry {
  slug: string;
  messages: number;
  usd: number;
}

function computeSourceBreakdown(perSourceState: PerSourceState): SourceBreakdownEntry[] {
  const out: SourceBreakdownEntry[] = [];
  for (const [slug, s] of perSourceState.entries()) {
    if (!s.touched) continue;
    let usd = 0;
    for (const [model, tokens] of Object.entries(s.modelTokens)) {
      const rates = priceFor(model);
      usd += priceTokens(tokens, ratesAsTokenKeys(rates));
    }
    out.push({ slug, messages: s.messages, usd: Number(usd.toFixed(4)) });
  }
  return out.sort((a, b) => b.usd - a.usd);
}

function buildModelMix(
  byModel: ByModel,
  messagesCounted: number,
  totalUsd: number
): Array<{
  model: string;
  pricedAs: string | null | undefined;
  messages: number;
  msgPct: number;
  usd: number;
  usdPct: number;
}> {
  return Object.entries(byModel)
    .map(([model, info]) => ({
      model,
      pricedAs: info.pricedAs,
      messages: info.messages,
      msgPct:
        messagesCounted > 0 ? Number(((info.messages / messagesCounted) * 100).toFixed(2)) : 0,
      usd: info.usd,
      usdPct: totalUsd > 0 ? Number(((info.usd / totalUsd) * 100).toFixed(2)) : 0
    }))
    .sort((a, b) => b.usd - a.usd);
}

function computeSizeStats(toolResultSizes: number[]): {
  count: number;
  sumBytes: number;
  p50Bytes: number;
  p90Bytes: number;
  maxBytes: number;
} {
  toolResultSizes.sort((a, b) => a - b);
  return {
    count: toolResultSizes.length,
    sumBytes: toolResultSizes.reduce((a, b) => a + b, 0),
    p50Bytes: percentile(toolResultSizes, 50),
    p90Bytes: percentile(toolResultSizes, 90),
    maxBytes: toolResultSizes[toolResultSizes.length - 1] ?? 0
  };
}

function collectFileReReadEntries(filesRead: Record<string, number>): Array<[string, number]> {
  return Object.entries(filesRead)
    .filter(([, c]) => c > 1)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
}

function buildToolUsage(
  toolUseCounts: Record<string, number>,
  toolFailureCounts: Record<string, number>
): Array<{ name: string; count: number; failures: number }> {
  return Object.entries(toolUseCounts)
    .map(([name, count]) => ({ name, count, failures: toolFailureCounts[name] ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

function buildSessionFileMap(sessionsBySource: Map<string, string[]>): {
  fileToSlug: Map<string, string>;
  sessions: string[];
} {
  const fileToSlug = new Map<string, string>();
  const sessions: string[] = [];
  for (const [slug, files] of sessionsBySource.entries()) {
    for (const f of files) {
      fileToSlug.set(f, slug);
      sessions.push(f);
    }
  }
  return { fileToSlug, sessions };
}

type ScanResult = Awaited<ReturnType<typeof scanSessions>>;

function assembleCostResult(
  scan: ScanResult,
  sessions: string[],
  effectiveSlug: string,
  autoDetected: boolean,
  aggregateAll: boolean,
  startedAt: string,
  endIso: string,
  startMs: number,
  endMs: number
): Record<string, unknown> {
  const {
    totals,
    byModel,
    messagesCounted,
    sessionsScanned,
    toolUseCounts,
    toolFailureCounts,
    toolResultSizes,
    filesRead,
    compactionCount,
    userMsgCount,
    userMsgTotalLen,
    skillInvocations,
    subagentDispatches,
    turnsBeforeFirstTool,
    perSourceState,
    toolCachePrime
  } = scan;
  const { totalUsd, unpricedModels } = priceByModel(byModel);
  const sources = computeSourceBreakdown(perSourceState);
  const modelMix = buildModelMix(byModel, messagesCounted, totalUsd);
  const sizeStats = computeSizeStats(toolResultSizes);
  const fileReReadEntries = collectFileReReadEntries(filesRead);
  const fileReReadCount = fileReReadEntries.reduce((a, [, c]) => a + ((c ?? 0) - 1), 0);
  const toolUsage = buildToolUsage(toolUseCounts, toolFailureCounts);
  const conversation = {
    userMsgCount,
    userMsgAvgLen: userMsgCount > 0 ? Math.round(userMsgTotalLen / userMsgCount) : 0,
    userMsgTotalLen,
    turnsBeforeFirstTool,
    compactionCount,
    skillInvocations,
    subagentDispatches
  };
  const toolCachePrimeArr = Object.entries(toolCachePrime)
    .map(([name, v]) => ({
      name,
      calls: v.calls,
      totalResultBytes: v.totalResultBytes,
      attributedCacheCreate: Math.round(v.attributedCacheCreate),
      ratio:
        v.totalResultBytes > 0
          ? Number((v.attributedCacheCreate / v.totalResultBytes).toFixed(2))
          : null
    }))
    .sort((a, b) => b.attributedCacheCreate - a.attributedCacheCreate);
  return {
    window: { start: startedAt, end: endIso, durationMs: endMs - startMs },
    totals,
    usd: Number(totalUsd.toFixed(4)),
    byModel,
    modelMix,
    messagesCounted,
    sessionsScanned,
    sessionsAvailable: sessions.length,
    sourceProject: effectiveSlug,
    autoDetected,
    aggregateAll,
    sources,
    // FEAT-025: models that never matched a pricing.json key (exact or
    // date-suffixed) -- surfaced in the cost-report frontmatter + flips the
    // cost-advisor verdict to "unknown" instead of a silent fallback price.
    unpriced_models: unpricedModels,
    toolUsage,
    toolResultSizes: sizeStats,
    fileReReadCount,
    fileReReadTopPaths: fileReReadEntries.slice(0, 5).map(([p, c]) => ({ path: p, reads: c })),
    conversation,
    toolCachePrime: toolCachePrimeArr
  };
}

export async function computeSessionCost(
  repoPath: string,
  {
    startedAt,
    completedAt,
    sourceProject = null,
    autoDetect = true,
    aggregateAll = false
  }: {
    startedAt?: string;
    completedAt?: string;
    sourceProject?: string | null;
    autoDetect?: boolean;
    aggregateAll?: boolean;
  } = {}
): Promise<Record<string, unknown>> {
  if (!startedAt) throw new Error("computeSessionCost requires startedAt");
  const endIso = completedAt ?? new Date().toISOString();
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endIso);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    throw new Error(`Invalid window: startedAt=${startedAt} completedAt=${endIso}`);
  }
  const { sessionsBySource, effectiveSlug, autoDetected } = await resolveScanSources({
    aggregateAll,
    sourceProject,
    autoDetect,
    repoPath,
    startedAt,
    endIso,
    startMs,
    endMs
  });
  const { fileToSlug, sessions } = buildSessionFileMap(sessionsBySource);
  const scan = await scanSessions({ sessions, fileToSlug, startMs, endMs });
  return assembleCostResult(
    scan,
    sessions,
    effectiveSlug,
    autoDetected,
    aggregateAll,
    startedAt,
    endIso,
    startMs,
    endMs
  );
}
