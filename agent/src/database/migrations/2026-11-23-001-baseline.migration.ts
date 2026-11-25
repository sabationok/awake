import { defineMigration } from '@nest-kit/sqlite';

/**
 * Схема на момент переходу на міграції. `IF NOT EXISTS`, тож на БД, створеній старим `DatabaseService`, нічого не змінює,
 * а на новій створює все. Без `down`: відкат базової схеми — це видалення БД.
 */
export const baselineMigration = defineMigration({
  name: '2026-11-23-001-baseline',
  up: (ctx) =>
    ctx.exec(`
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
      CREATE TABLE IF NOT EXISTS web_sessions (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        idle_minutes INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        last_active_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS web_sessions_device ON web_sessions(device_id);
      CREATE TABLE IF NOT EXISTS settings (
        module TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (module, key)
      );
    `),
});
