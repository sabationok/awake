import type { SessionSource, SleepTimerRecord } from '@awake/contracts';
import { Column, Entity, Index, PrimaryGeneratedColumn, StateDateColumn } from '@nest-kit/sqlite';

@Entity('sleep_timers')
@Index(['startedAt'], { name: 'sleep_timers_started_at' })
export class SleepTimerEntity implements SleepTimerRecord {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'text' }) startedAt!: string;
  @Column({ type: 'text' }) sleepAt!: string;
  @Column({ type: 'integer' }) minutes!: number;
  /** NULL — таймер ще йде. */
  @StateDateColumn() endedAt!: string | null;
  @Column({ type: 'text' }) source!: SessionSource;
  @Column({ type: 'text', nullable: true }) endReason!: string | null;
}
