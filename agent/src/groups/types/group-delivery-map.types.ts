import type { GroupProviderId } from '@awake/contracts';

/** Куди зараз можна слати в прив'язану групу: чат і живі топіки `джерело → thread id`. */
export interface GroupDeliveryMap {
  provider: GroupProviderId;
  chatId: string;
  threads: Record<string, number>;
}
