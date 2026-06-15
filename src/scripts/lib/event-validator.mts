import fs from "node:fs/promises";
import path from "node:path";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

// ajv-formats ESM/CJS interop: see lib/validate-event-schemas.mts for the
// same cast (verbatimModuleSyntax + NodeNext requires this shape).
type AddFormatsFn = (ajv: Ajv2020) => Ajv2020;
const addFormats = addFormatsModule as unknown as AddFormatsFn;

export interface EventEnvelope {
  tenantId: string;
  appId: string;
  kind: string;
  payload: Record<string, unknown>;
  sourcePath?: string;
  lineOffset?: number;
  emittedAt: string;
  schemaVersion?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export type EventValidator = (envelope: EventEnvelope) => ValidationResult;

interface IndexShape {
  schemaVersion: string;
  envelope: string;
  kinds: Record<string, string>;
}

async function loadJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function createEventValidator(schemasDir: string): Promise<EventValidator> {
  const index = (await loadJson(path.join(schemasDir, "index.json"))) as IndexShape;
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);

  const envelopeSchema = await loadJson(path.join(schemasDir, index.envelope));
  const envelopeValidator = ajv.compile(envelopeSchema as object);

  // Multiple kinds (e.g. all slice.* kinds) point at the same schema file.
  // Compile each file once and alias every kind to its compiled validator,
  // otherwise ajv's _checkUnique trips on the duplicate $id.
  const fileValidators = new Map<string, ValidateFunction>();
  const kindValidators = new Map<string, ValidateFunction>();
  for (const [kind, filename] of Object.entries(index.kinds)) {
    let validator = fileValidators.get(filename);
    if (!validator) {
      const schema = await loadJson(path.join(schemasDir, filename));
      validator = ajv.compile(schema as object);
      fileValidators.set(filename, validator);
    }
    kindValidators.set(kind, validator);
  }

  return (envelope: EventEnvelope): ValidationResult => {
    const errors: string[] = [];

    if (!envelopeValidator(envelope)) {
      for (const err of envelopeValidator.errors ?? []) {
        errors.push(`envelope${err.instancePath}: ${err.message}`);
      }
      return { ok: false, errors };
    }

    const kindValidator = kindValidators.get(envelope.kind);
    if (!kindValidator) {
      errors.push(`Unknown kind: ${envelope.kind}`);
      return { ok: false, errors };
    }

    if (!kindValidator(envelope.payload)) {
      for (const err of kindValidator.errors ?? []) {
        errors.push(`payload${err.instancePath}: ${err.message}`);
      }
      return { ok: false, errors };
    }

    return { ok: true, errors: [] };
  };
}
