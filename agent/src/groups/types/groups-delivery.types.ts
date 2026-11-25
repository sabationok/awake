import type { GroupTarget } from './group-provider.types';

/** Куди йдуть сповіщення: приватний чат власника, прив'язана група або обидва. */
export type GroupsDeliveryMode = 'private' | 'group' | 'both';

/** Адресат одного сповіщення: приватний чат власника або місце в групі. */
export type DeliveryAddressee = { kind: 'private' } | { kind: 'group'; target: GroupTarget };
