import { EntityRepository, SqliteRepository } from '@nest-kit/sqlite';
import { SleepTimerEntity } from '../entities/sleep-timer.entity';
import { FindManySleepTimersQuery } from '../query/find-many-sleep-timers.query';
import { FindOneSleepTimerQuery } from '../query/find-one-sleep-timer.query';

@EntityRepository(SleepTimerEntity)
export class SleepTimersRepository extends SqliteRepository<SleepTimerEntity, FindOneSleepTimerQuery, FindManySleepTimersQuery> {}
