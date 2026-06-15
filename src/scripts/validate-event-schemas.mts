import fs from "node:fs/promises";
import path from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

// ajv-formats is published as CJS with `module.exports = formatsPlugin` and
// `exports.default = formatsPlugin`. Under NodeNext + verbatimModuleSyntax,
// TS types the default import as the module namespace (not the function),
// so cast to the actual callable plugin shape.
type AddFormatsFn = (ajv: Ajv2020) => Ajv2020;
const addFormats = addFormatsModule as unknown as AddFormatsFn;

interface IndexShape {
  schemaVersion: string;
  envelope: string;
  kinds: Record<string, string>;
}

interface ValidatorOptions {
  indexOverride?: IndexShape;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export async function validateEventSchemas(
  repoRoot: string,
  opts: ValidatorOptions = {}
): Promise<ValidationResult> {
  const errors: string[] = [];
  const schemasDir = path.join(repoRoot, "schemas", "loop-events");

  let index: IndexShape;
  if (opts.indexOverride) {
    index = opts.indexOverride;
  } else {
    try {
      const raw = await fs.readFile(path.join(schemasDir, "index.json"), "utf8");
      index = JSON.parse(raw) as IndexShape;
    } catch (err) {
      return { ok: false, errors: [`Failed to read index.json: ${(err as Error).message}`] };
    }
  }

  if (!/^\d+\.\d+\.\d+$/.test(index.schemaVersion ?? "")) {
    errors.push(`index.json schemaVersion must be semver, got: ${index.schemaVersion}`);
  }

  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);

  const filesToCheck = new Set<string>([index.envelope, ...Object.values(index.kinds)]);
  for (const filename of filesToCheck) {
    const filePath = path.join(schemasDir, filename);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const schema = JSON.parse(raw);
      try {
        ajv.compile(schema);
      } catch (compileErr) {
        errors.push(`Invalid JSON Schema in ${filename}: ${(compileErr as Error).message}`);
      }
    } catch (err) {
      errors.push(`Missing or unreadable schema file ${filename}: ${(err as Error).message}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

if (import.meta.main) {
  const repoRoot = process.cwd();
  const result = await validateEventSchemas(repoRoot);
  if (!result.ok) {
    console.error("Event schema validation failed:");
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exitCode = 1;
  } else {
    console.log("Event schemas OK");
  }
}
