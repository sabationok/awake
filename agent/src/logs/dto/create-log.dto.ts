import type { LogEntity } from '../entities/log.entity';

export class CreateLogDto implements Pick<LogEntity, 'at' | 'text'> {
  at!: string;
  text!: string;
}
