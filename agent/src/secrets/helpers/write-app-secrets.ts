import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { SECRETS_ENV_PATH } from './read-app-secrets';

const NAME_PATTERN = /^\s*([A-Z0-9_]+)\s*=/;

/**
 * Записує в secrets.env лише передані імена: наявний рядок замінюється, нового імені рядок дописується, решта файлу
 * (ключі, які пише Mac-аппка) лишається як була. Права 600, запис через тимчасовий файл.
 */
export function writeAppSecrets(updates: ReadonlyMap<string, string>, path: string = process.env.MACONTROL_SECRETS_ENV || SECRETS_ENV_PATH): void {
  for (const value of updates.values()) {
    if (value.includes("'") || /[\r\n]/.test(value)) throw new Error('Значення не може містити лапку чи перенос рядка');
  }
  let text = '# Глобальні секрети аппки для агента awake\n';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    // Файлу ще немає: почнемо з заголовка.
  }
  const pending = new Map(updates);
  const lines = text.replace(/\n$/, '').split('\n').map((line) => {
    const name = NAME_PATTERN.exec(line)?.[1];
    if (!name || !pending.has(name)) return line;
    const value = pending.get(name)!;
    pending.delete(name);
    return `${name}='${value}'`;
  });
  for (const [name, value] of pending) lines.push(`${name}='${value}'`);
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, `${lines.join('\n')}\n`, { mode: 0o600 });
  chmodSync(temp, 0o600);
  renameSync(temp, path);
}
