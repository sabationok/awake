#!/usr/bin/env node
// Паспорт збірки: Resources/agent/build-info.json. Агент читає його на старті і сповіщає про нову збірку.
//   version  — app/package.json (веде Changesets)
//   changes  — записи .changeset/*.md, ще не закриті релізом (dev-збірки)
//   released — розділ app/CHANGELOG.md цієї версії (після `changeset version`)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const version = JSON.parse(readFileSync(join(root, 'app/package.json'), 'utf8')).version;

const changesetDir = join(root, '.changeset');
const changes = readdirSync(changesetDir)
  .filter((name) => name.endsWith('.md') && name !== 'README.md')
  .sort()
  .map((name) => {
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(readFileSync(join(changesetDir, name), 'utf8'));
    if (!match) return null;
    const bump = /:\s*(major|minor|patch)/.exec(match[1])?.[1] ?? 'patch';
    return { id: name.replace(/\.md$/, ''), bump, text: match[2].trim() };
  })
  .filter((change) => change && change.text);

function releasedSection() {
  const file = join(root, 'app/CHANGELOG.md');
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, 'utf8').split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim() || null;
}

let commit = '';
try {
  commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
} catch {}

const info = { version, stage: process.env.MACONTROL_STAGE || 'dev', commit, builtAt: new Date().toISOString(), changes, released: releasedSection() };
const out = process.argv[2] || join(root, 'Resources/agent/build-info.json');
writeFileSync(out, `${JSON.stringify(info, null, 2)}\n`);
console.log(`Паспорт збірки: ${version} (${info.stage}, ${commit}), змін у черзі: ${changes.length}`);
