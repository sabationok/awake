import type { SessionEntity } from '../entities/session.entity';

export class CreateSessionDto implements Pick<SessionEntity, 'startedAt' | 'duration' | 'source' | 'batteryStart'> {
  startedAt!: string;
  duration!: string | null;
  source!: SessionEntity['source'];
  batteryStart!: number | null;
}
