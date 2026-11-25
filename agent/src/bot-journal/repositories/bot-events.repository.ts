import { EntityRepository, IdQuery, SqliteRepository } from '@nest-kit/sqlite';
import { BotEventEntity } from '../entities/bot-event.entity';
import { FindManyBotEventsQuery } from '../query/find-many-bot-events.query';

@EntityRepository(BotEventEntity)
export class BotEventsRepository extends SqliteRepository<BotEventEntity, IdQuery, FindManyBotEventsQuery> {
  /** Лишає `keep` найновіших записів; повертає, скільки видалено. */
  deleteBeyond(keep: number): number {
    return this._qb('e').orderBy('id', 'DESC').offset(keep).delete();
  }
}
