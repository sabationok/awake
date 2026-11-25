import type { SleepTimerEntity } from '../entities/sleep-timer.entity';

export class CloseSleepTimerDto implements Pick<SleepTimerEntity, 'endReason'> {
  endedAt!: string;
  endReason!: string | null;
}
