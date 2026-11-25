import type { BotEventEntity } from '../entities/bot-event.entity';

export class CreateBotEventDto implements Omit<BotEventEntity, 'id'> {
  at!: string;
  source!: BotEventEntity['source'];
  type!: BotEventEntity['type'];
  namespace!: string;
  name!: string;
  ok!: boolean;
  error!: string | null;
  proxy!: string | null;
}
