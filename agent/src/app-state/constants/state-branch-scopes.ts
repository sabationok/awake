import type { UiScope } from '@macontrol/contracts';

/**
 * Одна мапа «гілка AppState → scope» (скіл `sdui`: стейт фільтрується за аудиторією, як сторінки). Чого тут немає —
 * `all`. Налаштування `modules.<module>.<key>` беруть scope зі свого визначення.
 */
export const STATE_BRANCH_SCOPES: Readonly<Record<string, UiScope>> = {
  permissions: 'local',
  'system.ssid': 'local',
};
