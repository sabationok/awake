import type { WebhookType } from '@macontrol/contracts';

export class FindOneWebhookQuery {
  id?: number;
  type?: WebhookType;
}
