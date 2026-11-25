import { EntityRepository, IdQuery, SqliteRepository } from '@nest-kit/sqlite';
import { LogEntity } from '../entities/log.entity';
import { FindManyLogsQuery } from '../query/find-many-logs.query';

@EntityRepository(LogEntity)
export class LogsRepository extends SqliteRepository<LogEntity, IdQuery, FindManyLogsQuery> {}
