// TS mirror of contracts/dev-build.schema.json (spec §2). The schema is the source of truth;
// change fields there and in the fixtures first, then here.
// Erasable syntax only (no enums, namespaces or parameter properties), so Node runs this file as-is.

export type DevBuildStage = 'dev' | 'preview' | 'production';

export interface DevBuildRow {
  label: string;
  value: string;
}

export interface DevBuildSdk {
  name: string;
  version: string;
}

export interface DevBuild {
  schemaVersion: 1;
  project: {
    id: string;
    name: string;
    variant?: string;
    displayName: string;
  };
  stage: DevBuildStage;
  version: string;
  buildNumber?: string;
  git: {
    branch: string;
    commit: string;
    dirty: boolean;
  };
  builtAt: string;
  extra?: DevBuildRow[];
  sdks?: DevBuildSdk[];
}

const STAGES: readonly DevBuildStage[] = ['dev', 'preview', 'production'];
const PROJECT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// RFC 3339 / ISO 8601 date-time with an explicit offset, as JSON Schema "date-time" requires.
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

type Obj = Record<string, unknown>;

function fail(path: string, message: string): never {
  throw new Error(`dev-build.json: ${path} ${message}`);
}

function isObject(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireObject(value: unknown, path: string): Obj {
  if (!isObject(value)) fail(path, 'must be an object');
  return value;
}

function requireString(obj: Obj, key: string, path: string, nonEmpty = false): string {
  const value = obj[key];
  if (typeof value !== 'string') fail(`${path}.${key}`, 'must be a string');
  if (nonEmpty && value.length === 0) fail(`${path}.${key}`, 'must not be empty');
  return value;
}

function optionalString(obj: Obj, key: string, path: string): string | undefined {
  if (obj[key] === undefined) return undefined;
  return requireString(obj, key, path);
}

function parseRows(value: unknown, path: string): DevBuildRow[] {
  if (!Array.isArray(value)) fail(path, 'must be an array');
  return value.map((item, i) => {
    const row = requireObject(item, `${path}[${i}]`);
    return {
      label: requireString(row, 'label', `${path}[${i}]`),
      value: requireString(row, 'value', `${path}[${i}]`),
    };
  });
}

function parseSdks(value: unknown, path: string): DevBuildSdk[] {
  if (!Array.isArray(value)) fail(path, 'must be an array');
  return value.map((item, i) => {
    const sdk = requireObject(item, `${path}[${i}]`);
    return {
      name: requireString(sdk, 'name', `${path}[${i}]`),
      version: requireString(sdk, 'version', `${path}[${i}]`),
    };
  });
}

/**
 * Validates a parsed dev-build.json and returns it typed as DevBuild.
 * Throws an Error whose message names the bad field, e.g. `dev-build.json: stage must be one of dev|preview|production`.
 * Unknown top-level keys are allowed and kept (forward compatible).
 */
export function parseDevBuild(json: unknown): DevBuild {
  const root = requireObject(json, '(root)');

  if (root.schemaVersion !== 1) fail('schemaVersion', 'must be the integer 1');

  const project = requireObject(root.project, 'project');
  const id = requireString(project, 'id', 'project');
  if (!PROJECT_ID.test(id)) fail('project.id', 'must be kebab-case (a-z, 0-9, single hyphens)');
  requireString(project, 'name', 'project', true);
  optionalString(project, 'variant', 'project');
  requireString(project, 'displayName', 'project', true);

  const stage = root.stage;
  if (typeof stage !== 'string' || !(STAGES as readonly string[]).includes(stage)) {
    fail('stage', `must be one of ${STAGES.join('|')}`);
  }

  requireString(root, 'version', '', true);
  optionalString(root, 'buildNumber', '');

  const git = requireObject(root.git, 'git');
  requireString(git, 'branch', 'git');
  requireString(git, 'commit', 'git');
  if (typeof git.dirty !== 'boolean') fail('git.dirty', 'must be a boolean');

  const builtAt = requireString(root, 'builtAt', '');
  if (!DATE_TIME.test(builtAt) || Number.isNaN(Date.parse(builtAt))) {
    fail('builtAt', 'must be an ISO 8601 date-time with an offset (e.g. 2026-11-27T10:00:00Z)');
  }

  if (root.extra !== undefined) parseRows(root.extra, 'extra');
  if (root.sdks !== undefined) parseSdks(root.sdks, 'sdks');

  return root as unknown as DevBuild;
}
