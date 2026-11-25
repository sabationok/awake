import { defineMigration } from '@nest-kit/sqlite';

/**
 * Старі денні лічильники вебхуків (таблиця metrics, scope `webhook:<id>`) → денні бакети metric_snapshots,
 * namespace `webhook.events`. Лише day: тижні й місяці з історії не відновлюються. Після цього таблиця metrics зникає.
 * Транзакцію дає runner, тож свого BEGIN / COMMIT тут немає. Без `down`: стара таблиця видалена.
 */
export const webhookMetricsMigration = defineMigration({
  name: '2026-11-23-005-webhook-metrics',
  up: (ctx) => {
    if (!ctx.hasTable('metrics')) return;
    ctx.exec(`
      INSERT INTO metric_snapshots (namespace, subject_type, subject_id, series_key, granularity, period_start, metrics, updated_at)
        SELECT 'webhook.events', 'webhook', substr(scope, 9), '', 'day', day || 'T00:00:00.000Z',
               json_group_object(metric, json_object('count', value)), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        FROM metrics WHERE scope LIKE 'webhook:%' GROUP BY scope, day
        ON CONFLICT DO NOTHING;
      DROP TABLE metrics;
    `);
  },
});
