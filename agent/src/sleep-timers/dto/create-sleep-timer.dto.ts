import type { SleepTimerEntity } from '../entities/sleep-timer.entity';

export class CreateSleepTimerDto implements Pick<SleepTimerEntity, 'startedAt' | 'sleepAt' | 'minutes' | 'source'> {
  startedAt!: string;
  sleepAt!: string;
  minutes!: number;
  source!: SleepTimerEntity['source'];
}
