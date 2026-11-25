import { defineMigration } from '@nest-kit/sqlite';

/**
 * «Віддалений доступ» тепер перемикачі на шлях (кілька паралельно) замість select `bot.remote`.
 * Вибраний шлях стає ввімкненим перемикачем; старий ключ зникає.
 */
export const remoteAccessMigration = defineMigration({
  name: '2026-11-23-007-remote-access',
  up: (ctx) =>
    ctx.exec(`
      INSERT OR IGNORE INTO settings (module, key, value)
        SELECT 'bot', 'remoteTailscale', CASE WHEN value = '"tailscale"' THEN 'true' ELSE 'false' END FROM settings WHERE module = 'bot' AND key = 'remote';
      INSERT OR IGNORE INTO settings (module, key, value)
        SELECT 'bot', 'remoteWebhooxy', CASE WHEN value = '"webhooxy"' THEN 'true' ELSE 'false' END FROM settings WHERE module = 'bot' AND key = 'remote';
      DELETE FROM settings WHERE module = 'bot' AND key = 'remote';
    `),
});
