import type { SessionRecord, SessionSource } from '@awake/contracts';
import { Column, Entity, Index, PrimaryGeneratedColumn, StateDateColumn } from '@nest-kit/sqlite';

@Entity('sessions')
@Index(['startedAt'], { name: 'sessions_started_at' })
export class SessionEntity implements SessionRecord {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'text' }) startedAt!: string;
  /** NULL — сесія ще йде. */
  @StateDateColumn() endedAt!: string | null;
  @Column({ type: 'text', nullable: true }) duration!: string | null;
  @Column({ type: 'text' }) source!: SessionSource;
  @Column({ type: 'text', nullable: true }) endReason!: string | null;
  @Column({ type: 'integer', nullable: true }) batteryStart!: number | null;
  @Column({ type: 'integer', nullable: true }) batteryEnd!: number | null;
}
