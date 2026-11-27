#!/usr/bin/env node
// Writes dev-build.json (the passport) for a consumer's build. Spec §2.
//
//   node gen-dev-build.mjs --out <file> [--project-id id] [--name N] [--variant V]
//                          [--package <path/to/package.json>] [--extra "Label=Value"]...
//
// Zero dependencies, Node >= 20. Git is read with execFileSync; outside a git work tree
// branch and commit are "unknown" and dirty is false.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const USAGE = `usage: gen-dev-build.mjs --out <file> [--project-id id] [--name N] [--variant V]
                       [--package <path/to/package.json>] [--extra "Label=Value"]...`;

const STAGES = ['dev', 'preview', 'production'];

function usageError(message) {
  throw new Error(`${message}\n${USAGE}`);
}

/** Parses argv (without node and script path). Repeated --extra accumulates. */
export function parseArgs(argv) {
  const opts = { extra: [] };
  const valueFlags = {
    '--out': 'out',
    '--project-id': 'projectId',
    '--name': 'name',
    '--variant': 'variant',
    '--package': 'package',
    '--extra': 'extra',
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const key = valueFlags[flag];
    if (!key) usageError(`unknown argument: ${flag}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) usageError(`${flag} needs a value`);
    i++;
    if (key === 'extra') opts.extra.push(value);
    else opts[key] = value;
  }
  if (!opts.out) usageError('--out is required');
  return opts;
}

/** "Label=Value" -> { label, value }. Splits on the first '=' only. */
export function parseExtra(spec) {
  const at = spec.indexOf('=');
  if (at <= 0) usageError(`--extra must look like "Label=Value", got: ${spec}`);
  return { label: spec.slice(0, at), value: spec.slice(at + 1) };
}

/** Turns an npm package name into a kebab-case project id: "@scope/My_App" -> "my-app". */
export function toProjectId(name) {
  return name
    .replace(/^@[^/]+\//, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/** Reads git facts for cwd. Everything is null-safe: outside git the values fall back to "unknown". */
export function readGit(cwd) {
  const inside = git(['rev-parse', '--is-inside-work-tree'], cwd);
  if (inside !== 'true') return { inside: false, branch: 'unknown', commit: 'unknown', dirty: false, count: null };
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd) ?? 'unknown';
  const commit = git(['rev-parse', '--short=7', 'HEAD'], cwd) ?? 'unknown';
  const dirty = (git(['status', '--porcelain'], cwd) ?? '') !== '';
  const count = git(['rev-list', '--count', 'HEAD'], cwd);
  return { inside: true, branch, commit, dirty, count };
}

/** Builds the passport object. `now` and `env` are injectable for tests. */
export function buildPassport({ opts, pkg, git: gitInfo, env = process.env, now = new Date() }) {
  const name = opts.name ?? pkg.name;
  if (!name) usageError('no --name and no "name" in package.json');
  const id = opts.projectId ?? toProjectId(name);
  const variant = opts.variant;

  const stage = env.STAGE ?? 'dev';
  if (!STAGES.includes(stage)) usageError(`STAGE must be one of ${STAGES.join('|')}, got: ${stage}`);

  const version = pkg.version;
  if (typeof version !== 'string' || version.length === 0) usageError('package.json has no "version"');

  const buildNumber = env.BUILD_NUMBER ?? gitInfo.count ?? undefined;

  const project = {
    id,
    name,
    ...(variant ? { variant } : {}),
    displayName: variant ? `${name} (${variant})` : name,
  };

  const passport = {
    schemaVersion: 1,
    project,
    stage,
    version,
    ...(buildNumber ? { buildNumber: String(buildNumber) } : {}),
    git: { branch: gitInfo.branch, commit: gitInfo.commit, dirty: gitInfo.dirty },
    builtAt: now.toISOString(),
  };
  if (opts.extra.length > 0) passport.extra = opts.extra.map(parseExtra);
  return passport;
}

function main(argv) {
  const opts = parseArgs(argv);
  const pkgPath = resolve(opts.package ?? 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    usageError(`cannot read ${pkgPath}: ${err.message}`);
  }
  const outPath = resolve(opts.out);
  const passport = buildPassport({ opts, pkg, git: readGit(dirname(pkgPath)) });

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(passport, null, 2)}\n`);
  console.log(outPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
