import { defineMigration } from '@nest-kit/sqlite';

/**
 * Webhooxy був джерелом `relay`, тепер це проксі вебу: колонка `proxy`, старі записи й лічильники
 * `src.relay` переходять у `src.web` + `proxy.webhooxy`. Ідемпотентна: БД до міграцій могла її вже пройти.
 */
export const relaySourceMigration = defineMigration({
  name: '2026-11-23-002-relay-source',
  up: (ctx) => {
    ctx.addColumnIfMissing('bot_events', 'proxy', 'TEXT');
    ctx.exec("UPDATE bot_events SET source = 'web', proxy = 'webhooxy' WHERE source = 'relay'");
    if (!ctx.hasTable('bot_metrics')) return;
    ctx.exec(`
      INSERT INTO bot_metrics (day, metric, value)
        SELECT day, m.metric, value FROM bot_metrics, (SELECT 'src.web' AS metric UNION ALL SELECT 'proxy.webhooxy') AS m
        WHERE bot_metrics.metric = 'src.relay'
        ON CONFLICT (day, metric) DO UPDATE SET value = bot_metrics.value + excluded.value;
      DELETE FROM bot_metrics WHERE metric = 'src.relay';
    `);
  },
});
