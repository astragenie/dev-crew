import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ValidateResult = {
  errors: string[];
  warnings: string[];
  filesScanned: number;
};

const SLICES_ROOT = ".claude/artifacts/loop/ai-loop/slices";
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

// Which frontmatter `status:` values are legitimate for a slice filed in a
// given state directory. Derived from the repo's actual observed convention
// (not an assumption): `completed/` already holds both `status: completed`
// (the overwhelming majority) and a couple of pre-existing `status: done`
// slices, and the backlog side has the same "done is a valid terminal label"
// precedent (FEAT-102, superseded-but-filed-as-done). `superseded` is folded
// into the same terminal bucket — there is no separate `superseded/`
// directory in this tree, so a superseded slice's closed frontmatter status
// is honored as-is once it is filed alongside other terminal work.
// Directories not listed here (e.g. a future `in-progress/`) are still
// scanned for the cross-directory duplicate-id check but are not held to a
// specific status set.
const DIR_STATUS_RULES: Record<string, string[]> = {
  pending: ["pending"],
  completed: ["completed", "done", "superseded"]
};

type SliceRecord = {
  id: string;
  status: string | null;
  dir: string;
  path: string;
};

function listStateDirs(repoRoot: string): string[] {
  const root = join(repoRoot, SLICES_ROOT);
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory());
}

function extractField(raw: string, key: string): string | null {
  const fm = raw.match(FRONTMATTER_RE);
  if (!fm?.[1]) return null;
  const m = fm[1].match(new RegExp(`^${key}:\\s*"?([^"\\r\\n]*?)"?\\s*$`, "m"));
  return m?.[1]?.trim() || null;
}

// Falls back to the filename's `SLICE_<n>` prefix when frontmatter omits
// `id:` — every slice file observed in this tree carries that prefix, so
// this keeps the duplicate-id check working even against a malformed file
// rather than silently skipping it.
function deriveId(raw: string, fileName: string): string {
  const declared = extractField(raw, "id");
  if (declared) return declared;
  const m = fileName.match(/^SLICE_(\d+)/);
  return m ? `SLICE-${m[1]}` : fileName;
}

function listSlices(repoRoot: string): SliceRecord[] {
  const out: SliceRecord[] = [];
  for (const dir of listStateDirs(repoRoot)) {
    const dirPath = join(repoRoot, SLICES_ROOT, dir);
    for (const name of readdirSync(dirPath)) {
      if (!name.endsWith(".md")) continue;
      const filePath = join(dirPath, name);
      const raw = readFileSync(filePath, "utf8");
      out.push({
        id: deriveId(raw, name),
        status: extractField(raw, "status"),
        dir,
        path: filePath
      });
    }
  }
  return out;
}

// Condition (a): the same slice id filed across more than one *distinct*
// state directory (the SLICE-118 case — one copy in pending/, another in
// completed/). Remedy is a filing decision (pick the real copy, delete the
// other) — kept separate from condition (b) below because a status/directory
// disagreement is instead a frontmatter fix.
//
// Deliberately scoped to distinct directories, not raw file count: this repo
// has a separate, already-tracked id-collision defect (FEAT-257 — allocation
// races producing two unrelated slices with the same numeric id inside the
// SAME directory) that is out of scope here and must not be conflated with
// directory-placement drift.
function checkDuplicates(slices: SliceRecord[], repoRoot: string): string[] {
  const byId = new Map<string, SliceRecord[]>();
  for (const s of slices) {
    const bucket = byId.get(s.id);
    if (bucket) bucket.push(s);
    else byId.set(s.id, [s]);
  }
  const errors: string[] = [];
  for (const [id, records] of byId) {
    const distinctDirs = new Set(records.map((r) => r.dir));
    if (distinctDirs.size < 2) continue;
    const locations = records.map((r) => `${r.dir}/ (${relative(repoRoot, r.path)})`).join(", ");
    errors.push(`${id}: present in more than one state directory: ${locations}`);
  }
  return errors;
}

function relative(repoRoot: string, filePath: string): string {
  return filePath.startsWith(repoRoot) ? filePath.slice(repoRoot.length + 1) : filePath;
}

// Condition (b): a frontmatter `status:` that disagrees with the directory
// it is filed under (e.g. `status: done` sitting in `pending/`). Remedy is
// moving the file — kept separate from the duplicate check above.
function checkStatusDirAgreement(slices: SliceRecord[]): string[] {
  const errors: string[] = [];
  for (const s of slices) {
    const allowed = DIR_STATUS_RULES[s.dir];
    if (!allowed) continue;
    if (s.status === null) {
      errors.push(`${s.id}: missing frontmatter status (filed under ${s.dir}/)`);
      continue;
    }
    if (!allowed.includes(s.status)) {
      errors.push(
        `${s.id}: frontmatter status "${s.status}" disagrees with its directory "${s.dir}/" (expected one of: ${allowed.join(", ")})`
      );
    }
  }
  return errors;
}

export function validateRepo(repoRoot: string): ValidateResult {
  const slices = listSlices(repoRoot);
  const errors = [...checkDuplicates(slices, repoRoot), ...checkStatusDirAgreement(slices)];
  return { errors, warnings: [], filesScanned: slices.length };
}

function isMainEntry(): boolean {
  if (!process.argv[1]) return false;
  const entryPath = resolve(process.argv[1]);
  const thisPath = fileURLToPath(import.meta.url);
  return entryPath === thisPath;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const repoIdx = args.indexOf("--repo");
  const repoRoot = repoIdx >= 0 && args[repoIdx + 1] ? args[repoIdx + 1]! : process.cwd();

  const r = validateRepo(repoRoot);
  for (const e of r.errors) console.error(`ERROR ${e}`);
  console.log(`Scanned ${r.filesScanned} slice files; ${r.errors.length} errors`);
  if (r.errors.length > 0) process.exitCode = 1;
}

if (isMainEntry()) {
  void main();
}
