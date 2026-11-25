// Модулі агента не пишуть SQL: лише параметри SqliteRepository, find-оператори або _qb().
// SQL-текст дозволений тільки в shim пакета (src/nest-kit/) і в міграціях (src/database/migrations/).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname;
const ALLOWED = ['nest-kit/', 'database/migrations/'];
const FORBIDDEN = [
  { pattern: /\.prepare\(/, why: 'prepared statement' },
  { pattern: /\b(?:db|_db|database)\.exec\(/, why: 'raw exec' },
  { pattern: /\bDatabaseSync\b/, why: 'node:sqlite connection' },
  { pattern: /\bSqliteDataSource\b/, why: 'data source in a module' },
  { pattern: /\b(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/, why: 'SQL text' },
];

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.ts')) files.push(path);
  }
})(ROOT);

const problems = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  if (ALLOWED.some((prefix) => rel.startsWith(prefix))) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    for (const { pattern, why } of FORBIDDEN) if (pattern.test(line)) problems.push(`src/${rel}:${index + 1}  ${why}: ${line.trim()}`);
  });
}

if (problems.length) {
  console.error(`raw SQL outside the SQLite layer (${problems.length}):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('no raw SQL in modules');
