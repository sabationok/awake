import type { GroupProviderManifest } from '@awake/contracts';

/** Що конектор Telegram справді вміє в групах. Нова можливість з'являється тут лише разом із реалізацією. */
export const TELEGRAM_GROUPS_MANIFEST: GroupProviderManifest = {
  id: 'telegram',
  title: 'Telegram',
  capabilities: ['topics', 'commands'],
  limits: { messagesPerMinute: 20 },
};
