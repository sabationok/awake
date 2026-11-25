import type { MigrationEntry } from '@nest-kit/sqlite';
import { baselineMigration } from './2026-11-23-001-baseline.migration';
import { relaySourceMigration } from './2026-11-23-002-relay-source.migration';
import { devicesViaMigration } from './2026-11-23-003-devices-via.migration';
import { proxyIdsMigration } from './2026-11-23-004-proxy-ids.migration';
import { webhookMetricsMigration } from './2026-11-23-005-webhook-metrics.migration';
import { botMetricsMigration } from './2026-11-23-006-bot-metrics.migration';
import { remoteAccessMigration } from './2026-11-23-007-remote-access.migration';
import { groupsMigration } from './2026-11-25-008-groups.migration';
import { groupsLiveUniqueMigration } from './2026-11-25-009-groups-live-unique.migration';

/**
 * Усі міграції агента. Нова зміна схеми — новий файл `<yyyy-mm-dd>-<nnn>-<what>.migration.ts` тут і рядок у списку;
 * виконані міграції не редагуються. Порядок виконання — за іменем.
 */
export const DATABASE_MIGRATIONS: MigrationEntry[] = [
  baselineMigration,
  relaySourceMigration,
  devicesViaMigration,
  proxyIdsMigration,
  webhookMetricsMigration,
  botMetricsMigration,
  remoteAccessMigration,
  groupsMigration,
  groupsLiveUniqueMigration,
];
