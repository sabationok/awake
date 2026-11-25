import { defineMigration } from '@nest-kit/sqlite';

/**
 * Модуль «Групи»: прив'язана група чату і топіки сповіщень. Топік унікальний за джерелом і за thread id лише серед
 * живих (soft delete лишає старий рядок, щоб створити новий для того самого джерела).
 */
export const groupsMigration = defineMigration({
  name: '2026-11-25-008-groups',
  up: (ctx) =>
    ctx.exec(`
      CREATE TABLE IF NOT EXISTS group_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        external_id TEXT NOT NULL,
        title TEXT NOT NULL,
        added_by TEXT NOT NULL,
        bot_rights TEXT NOT NULL,
        topics_enabled_at TEXT,
        requested_at TEXT,
        bound_at TEXT,
        left_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS group_chats_external ON group_chats(provider, external_id);
      CREATE TABLE IF NOT EXISTS group_topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
        thread_id INTEGER NOT NULL,
        source TEXT NOT NULL,
        name TEXT NOT NULL,
        closed_at TEXT,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS group_topics_group ON group_topics(group_id);
      CREATE UNIQUE INDEX IF NOT EXISTS group_topics_live_source ON group_topics(group_id, source) WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS group_topics_live_thread ON group_topics(group_id, thread_id) WHERE deleted_at IS NULL;
    `),
  down: (ctx) =>
    ctx.exec(`
      DROP TABLE IF EXISTS group_topics;
      DROP TABLE IF EXISTS group_chats;
    `),
});
