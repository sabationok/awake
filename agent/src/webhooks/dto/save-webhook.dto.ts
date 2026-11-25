import type { WebhookEntity } from '../entities/webhook.entity';

/** Поля, які задає користувач: і для створення, і для зміни. */
export class SaveWebhookDto implements Pick<WebhookEntity, 'whId' | 'provider' | 'type' | 'mode' | 'workspace' | 'destId' | 'config'> {
  whId!: string;
  provider!: WebhookEntity['provider'];
  type!: WebhookEntity['type'];
  mode!: WebhookEntity['mode'];
  workspace!: string;
  destId!: string;
  config!: WebhookEntity['config'];
}
