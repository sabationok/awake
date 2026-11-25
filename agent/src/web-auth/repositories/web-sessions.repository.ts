import { EntityRepository, LessThan, SqliteRepository, type SqliteWhereBuilder, type SqliteWhereQuery } from '@nest-kit/sqlite';
import { WebSessionEntity } from '../entities/web-session.entity';
import { FindManyWebSessionsQuery } from '../query/find-many-web-sessions.query';
import { FindOneWebSessionQuery } from '../query/find-one-web-session.query';

@EntityRepository(WebSessionEntity)
export class WebSessionsRepository extends SqliteRepository<WebSessionEntity, FindOneWebSessionQuery, FindManyWebSessionsQuery> {
  protected override _applyWhere(
    where: SqliteWhereBuilder<WebSessionEntity>,
    query: SqliteWhereQuery<FindOneWebSessionQuery, FindManyWebSessionsQuery>,
  ): void {
    const { staleBefore, ...rest } = query;
    super._applyWhere(where, rest);
    if (staleBefore !== undefined) {
      where.or(
        (group) => group.field('revokedAt', LessThan(staleBefore)),
        (group) => group.field('lastActiveAt', LessThan(staleBefore)),
      );
    }
  }
}
