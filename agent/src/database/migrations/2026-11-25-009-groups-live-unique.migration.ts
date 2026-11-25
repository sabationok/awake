import { defineMigration } from '@nest-kit/sqlite';

/**
 * «Групи»: серед живих рядків (не відв'язаних) група провайдера одна і прив'язана група одна. Перед індексами дані
 * приводяться до цього: відв'язані рядки втрачають `bound_at` / `requested_at` (раніше `unbind` лишав їх), з кількох
 * живих рядків однієї групи лишається останній, з кількох прив'язаних — перший. Неунікальний індекс
 * `group_chats_external` з 008 лишається: він потрібен пошуку разом із відв'язаними.
 */
export const groupsLiveUniqueMigration = defineMigration({
  name: '2026-11-25-009-groups-live-unique',
  up: (ctx) =>
    ctx.exec(`
      UPDATE group_chats SET bound_at = NULL, requested_at = NULL WHERE deleted_at IS NOT NULL;
      UPDATE group_chats SET bound_at = NULL, requested_at = NULL, deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE deleted_at IS NULL
          AND id NOT IN (SELECT MAX(id) FROM group_chats WHERE deleted_at IS NULL GROUP BY provider, external_id);
      UPDATE group_chats SET bound_at = NULL
        WHERE deleted_at IS NULL AND bound_at IS NOT NULL
          AND id <> (SELECT MIN(id) FROM group_chats WHERE deleted_at IS NULL AND bound_at IS NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS group_chats_live_external ON group_chats(provider, external_id) WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS group_chats_live_bound ON group_chats((bound_at IS NOT NULL))
        WHERE deleted_at IS NULL AND bound_at IS NOT NULL;
    `),
  down: (ctx) =>
    ctx.exec(`
      DROP INDEX IF EXISTS group_chats_live_bound;
      DROP INDEX IF EXISTS group_chats_live_external;
    `),
});
