import { EntityRepository, SqliteRepository } from '@nest-kit/sqlite';
import { SessionEntity } from '../entities/session.entity';
import { FindManySessionsQuery } from '../query/find-many-sessions.query';
import { FindOneSessionQuery } from '../query/find-one-session.query';

@EntityRepository(SessionEntity)
export class SessionsRepository extends SqliteRepository<SessionEntity, FindOneSessionQuery, FindManySessionsQuery> {}
