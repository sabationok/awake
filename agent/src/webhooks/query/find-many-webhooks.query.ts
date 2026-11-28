import type { WebhookType } from '@macontrol/contracts';
import { FindManyQueryBase } from '@nest-kit/sqlite';

export class FindManyWebhooksQuery extends FindManyQueryBase {
  type?: WebhookType;
  disabled?: boolean;
}
