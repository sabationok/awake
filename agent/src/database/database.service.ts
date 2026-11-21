import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';

/** Одне з'єднання SQLite на весь агент. Схема створюється при старті. */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
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
      CREATE TABLE IF NOT EXISTS bot_metrics (
        day TEXT NOT NULL,
        metric TEXT NOT NULL,
        value INTEGER NOT NULL,
        PRIMARY KEY (day, metric)
      );
      CREATE TABLE IF NOT EXISTS settings (
        module TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (module, key)
      );
    `);
    this._migrateRelaySource();
  }

  /**
   * Webhooxy був джерелом `relay`, тепер це проксі вебу: колонка `proxy`, старі записи й лічильники
   * `src.relay` переходять у `src.web` + `proxy.webhooxy`. Ідемпотентно: після першого запуску `relay` не лишається.
   */
  private _migrateRelaySource() {
    const columns = this.db.prepare('PRAGMA table_info(bot_events)').all() as { name: string }[];
    if (!columns.some((column) => column.name === 'proxy')) this.db.exec('ALTER TABLE bot_events ADD COLUMN proxy TEXT');
    this.db.exec(`
      UPDATE bot_events SET source = 'web', proxy = 'webhooxy' WHERE source = 'relay';
      INSERT INTO bot_metrics (day, metric, value)
        SELECT day, m.metric, value FROM bot_metrics, (SELECT 'src.web' AS metric UNION ALL SELECT 'proxy.webhooxy') AS m
        WHERE bot_metrics.metric = 'src.relay'
        ON CONFLICT (day, metric) DO UPDATE SET value = bot_metrics.value + excluded.value;
      DELETE FROM bot_metrics WHERE metric = 'src.relay';
    `);
  }

  onModuleDestroy() {
    this.db.close();
  }
}
