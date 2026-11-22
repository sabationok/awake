import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';

/** Одне з'єднання SQLite на весь агент. Схема створюється при старті. */
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly db: DatabaseSync;

  constructor(@Inject(AGENT_CONFIG) config: AgentConfig) {
    mkdirSync(dirname(config.dbPath), { recursive: true });
    this.db = new DatabaseSync(config.dbPath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration TEXT,
        source TEXT NOT NULL,
        end_reason TEXT,
        battery_start INTEGER,
        battery_end INTEGER
      );
      CREATE INDEX IF NOT EXISTS sessions_started_at ON sessions(started_at);
      CREATE TABLE IF NOT EXISTS sleep_timers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        sleep_at TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        ended_at TEXT,
        source TEXT NOT NULL,
        end_reason TEXT
      );
      CREATE INDEX IF NOT EXISTS sleep_timers_started_at ON sleep_timers(started_at);
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at TEXT NOT NULL,
        text TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS logs_at ON logs(at);
      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_hash TEXT NOT NULL UNIQUE,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        last_seen_at TEXT
      );
      DROP TABLE IF EXISTS bot_messages;
      CREATE TABLE IF NOT EXISTS bot_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at TEXT NOT NULL,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        namespace TEXT NOT NULL,
        name TEXT NOT NULL,
        ok INTEGER NOT NULL,
        error TEXT,
        proxy TEXT
      );
      CREATE TABLE IF NOT EXISTS trusted_networks (
        ssid TEXT PRIMARY KEY,
        added_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wh_id TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        type TEXT NOT NULL,
        mode TEXT NOT NULL,
        workspace TEXT NOT NULL,
        dest_id TEXT NOT NULL,
        config TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT,
        disabled_at TEXT,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS metric_snapshots (
        namespace TEXT NOT NULL,
        subject_type TEXT NOT NULL,
        subject_id TEXT NOT NULL DEFAULT '',
        series_key TEXT NOT NULL DEFAULT '',
        granularity TEXT NOT NULL,
        period_start TEXT NOT NULL,
        metrics TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (namespace, subject_type, subject_id, series_key, granularity, period_start)
      );
      CREATE INDEX IF NOT EXISTS metric_snapshots_period ON metric_snapshots (granularity, period_start);
      CREATE TABLE IF NOT EXISTS settings (
        module TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (module, key)
      );
    `);
    this._migrateRelaySource();
    this._addColumn('devices', 'via', "TEXT NOT NULL DEFAULT 'local'");
    this._migrateProxyIds();
    this._migrateWebhookMetrics();
    this._migrateBotMetrics();
  }

  private _hasTable(name: string): boolean {
    return !!this.db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  }

  /**
   * Старі денні лічильники бота (bot_metrics, плаский ключ на день) → денні бакети `bot.legacy`. Розрізів між вимірами
   * (модуль × тип × джерело) у них немає, тож вони лишаються окремим namespace, а BotJournalService додає їх до сум.
   */
  private _migrateBotMetrics() {
    if (!this._hasTable('bot_metrics')) return;
    this.db.exec(`
      BEGIN;
      INSERT INTO metric_snapshots (namespace, subject_type, subject_id, series_key, granularity, period_start, metrics, updated_at)
        SELECT 'bot.legacy', 'none', '', '', 'day', day || 'T00:00:00.000Z',
               json_group_object(metric, json_object('count', value)), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        FROM bot_metrics GROUP BY day
        ON CONFLICT DO NOTHING;
      DROP TABLE bot_metrics;
      COMMIT;
    `);
  }

  /**
   * Старі денні лічильники вебхуків (таблиця metrics, scope `webhook:<id>`) → денні бакети metric_snapshots,
   * namespace `webhook.events`. Лише day: тижні й місяці з історії не відновлюються. Після цього таблиця metrics зникає.
   */
  private _migrateWebhookMetrics() {
    const exists = this.db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'metrics'").get();
    if (!exists) return;
    this.db.exec(`
      BEGIN;
      INSERT INTO metric_snapshots (namespace, subject_type, subject_id, series_key, granularity, period_start, metrics, updated_at)
        SELECT 'webhook.events', 'webhook', substr(scope, 9), '', 'day', day || 'T00:00:00.000Z',
               json_group_object(metric, json_object('count', value)), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        FROM metrics WHERE scope LIKE 'webhook:%' GROUP BY scope, day
        ON CONFLICT DO NOTHING;
      DROP TABLE metrics;
      COMMIT;
    `);
  }

  /** Додає колонку в існуючу таблицю, якщо її ще немає. */
  private _addColumn(table: string, column: string, definition: string) {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!columns.some((existing) => existing.name === column)) this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  /**
   * Webhooxy був джерелом `relay`, тепер це проксі вебу: колонка `proxy`, старі записи й лічильники
   * `src.relay` переходять у `src.web` + `proxy.webhooxy`. Ідемпотентно: після першого запуску `relay` не лишається.
   */
  private _migrateRelaySource() {
    const columns = this.db.prepare('PRAGMA table_info(bot_events)').all() as { name: string }[];
    if (!columns.some((column) => column.name === 'proxy')) this.db.exec('ALTER TABLE bot_events ADD COLUMN proxy TEXT');
    this.db.exec("UPDATE bot_events SET source = 'web', proxy = 'webhooxy' WHERE source = 'relay'");
    if (!this._hasTable('bot_metrics')) return;
    this.db.exec(`
      INSERT INTO bot_metrics (day, metric, value)
        SELECT day, m.metric, value FROM bot_metrics, (SELECT 'src.web' AS metric UNION ALL SELECT 'proxy.webhooxy') AS m
        WHERE bot_metrics.metric = 'src.relay'
        ON CONFLICT (day, metric) DO UPDATE SET value = bot_metrics.value + excluded.value;
      DELETE FROM bot_metrics WHERE metric = 'src.relay';
    `);
  }

  /** Проксі тепер `<protocol>:<provider>`: старий `webhooxy` — це сокет relay, `ws:webhooxy`. Ідемпотентно. */
  private _migrateProxyIds() {
    if (!this._hasTable('bot_metrics')) return;
    this.db.exec(`
      UPDATE bot_events SET proxy = 'ws:webhooxy' WHERE proxy = 'webhooxy';
      INSERT INTO bot_metrics (day, metric, value)
        SELECT day, 'proxy.ws:webhooxy', value FROM bot_metrics WHERE metric = 'proxy.webhooxy'
        ON CONFLICT (day, metric) DO UPDATE SET value = bot_metrics.value + excluded.value;
      DELETE FROM bot_metrics WHERE metric = 'proxy.webhooxy';
    `);
  }

  /** Остання фаза зупинки: до неї (beforeApplicationShutdown) інші ще пишуть, зокрема flush статистики. */
  onApplicationShutdown() {
    this.db.close();
  }
}
