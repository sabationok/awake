import { Module } from '@nestjs/common';
import { SqliteModule } from '@nest-kit/sqlite';
import { AGENT_CONFIG, type AgentConfig } from '../config/agent-config';
import { DATABASE_MIGRATIONS } from './migrations';

/**
 * Одне з'єднання SQLite на агент і міграції схеми (`./migrations`). Модулі працюють лише через свої
 * `SqliteRepository`; SQL-текст живе тільки в `@nest-kit/sqlite` і в міграціях (перевіряє scripts/check-no-raw-sql.mjs).
 */
@Module({
  imports: [
    SqliteModule.forRootAsync({
      inject: [AGENT_CONFIG],
      useFactory: (config: AgentConfig) => ({
        path: config.dbPath,
        pragmas: { journal_mode: 'WAL', foreign_keys: 'ON' },
      }),
      migrations: DATABASE_MIGRATIONS,
    }),
  ],
})
export class DatabaseModule {}
