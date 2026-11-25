import type { GroupCapability } from '@awake/contracts';

/** Усі можливості ядра груп з підписом: сторінка показує кожну, незадекларовану конектором — сірою з причиною. */
export const GROUP_CAPABILITY_LABEL: Record<GroupCapability, string> = {
  topics: 'Топіки на джерело',
  commands: 'Команди в групі',
  pins: 'Закріплення повідомлень',
  inviteLinks: 'Запрошення',
  members: 'Учасники',
  joinRequests: 'Заявки на вступ',
};
