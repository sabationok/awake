import type { WebhookType } from '@awake/contracts';

export class FindOneWebhookQuery {
  id?: number;
  type?: WebhookType;
}
