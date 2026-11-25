import { defineMigration } from '@nest-kit/sqlite';

/** Проксі тепер `<protocol>:<provider>`: старий `webhooxy` — це сокет relay, `ws:webhooxy`. Ідемпотентна. */
export const proxyIdsMigration = defineMigration({
  name: '2026-11-23-004-proxy-ids',
  up: (ctx) => {
    if (!ctx.hasTable('bot_metrics')) return;
    ctx.exec(`
      UPDATE bot_events SET proxy = 'ws:webhooxy' WHERE proxy = 'webhooxy';
      INSERT INTO bot_metrics (day, metric, value)
        SELECT day, 'proxy.ws:webhooxy', value FROM bot_metrics WHERE metric = 'proxy.webhooxy'
        ON CONFLICT (day, metric) DO UPDATE SET value = bot_metrics.value + excluded.value;
      DELETE FROM bot_metrics WHERE metric = 'proxy.webhooxy';
    `);
  },
});
