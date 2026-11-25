import type { WebhookEntity } from '../entities/webhook.entity';

/** `disabledAt: null` — увімкнути. */
export class SetWebhookDisabledDto implements Pick<WebhookEntity, 'disabledAt'> {
  disabledAt!: string | null;
}
