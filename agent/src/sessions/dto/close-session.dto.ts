import type { SessionEntity } from '../entities/session.entity';

export class CloseSessionDto implements Pick<SessionEntity, 'endReason' | 'batteryEnd'> {
  endedAt!: string;
  endReason!: string | null;
  batteryEnd!: number | null;
}
