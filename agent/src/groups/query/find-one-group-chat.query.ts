import type { GroupProviderId } from '@macontrol/contracts';

export class FindOneGroupChatQuery {
  id?: number;
  provider?: GroupProviderId;
  externalId?: string;
  /** `true` — прив'язана (`boundAt` не NULL). */
  bound?: boolean;
  /** `false` — бот у групі. */
  left?: boolean;
}
