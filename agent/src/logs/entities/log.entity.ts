import type { LogRecord } from '@awake/contracts';
import { Column, Entity, Index, PrimaryGeneratedColumn } from '@nest-kit/sqlite';

@Entity('logs')
@Index(['at'], { name: 'logs_at' })
export class LogEntity implements LogRecord {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'text' }) at!: string;
  @Column({ type: 'text' }) text!: string;
}
