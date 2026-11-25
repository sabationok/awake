import { defineMigration } from '@nest-kit/sqlite';

/**
 * Старі денні лічильники бота (bot_metrics, плаский ключ на день) → денні бакети `bot.legacy`. Розрізів між вимірами
 * (модуль × тип × джерело) у них немає, тож вони лишаються окремим namespace, а BotJournalService додає їх до сум.
 * Транзакцію дає runner. Без `down`: стара таблиця видалена.
 */
export const botMetricsMigration = defineMigration({
  name: '2026-11-23-006-bot-metrics',
  up: (ctx) => {
    if (!ctx.hasTable('bot_metrics')) return;
    ctx.exec(`
      INSERT INTO metric_snapshots (namespace, subject_type, subject_id, series_key, granularity, period_start, metrics, updated_at)
        SELECT 'bot.legacy', 'none', '', '', 'day', day || 'T00:00:00.000Z',
               json_group_object(metric, json_object('count', value)), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        FROM bot_metrics GROUP BY day
        ON CONFLICT DO NOTHING;
      DROP TABLE bot_metrics;
    `);
  },
});
