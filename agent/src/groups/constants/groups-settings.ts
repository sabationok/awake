import type { SelectSetting, SettingDefinition, SwitchSetting } from '@awake/contracts';
import { statsPeriodSetting } from '../../stats';
import { GROUPS_PAGE, GROUPS_STATS_PAGE } from './groups-module';

export const GROUPS_DELIVERY_KEY = 'delivery';
export const GROUPS_FALLBACK_PRIVATE_KEY = 'fallbackPrivate';
export const GROUPS_COMMANDS_KEY = 'commands';
/** Префікс перемикача «джерело має свій топік»: `topic.<id джерела>`. */
export const GROUPS_TOPIC_KEY_PREFIX = 'topic.';

/**
 * Куди йдуть сповіщення. За замовчуванням `group` (рішення власника 2026-11-25): щойно група прив'язана, події
 * йдуть у неї; поки групи немає, `pickDelivery` і так шле в приватний чат.
 */
export const GROUPS_DELIVERY_SETTING: SelectSetting = {
  type: 'select',
  key: GROUPS_DELIVERY_KEY,
  label: 'Куди слати сповіщення',
  hint: 'Поки групу не прив\'язано, сповіщення йдуть у приватний чат',
  icon: { symbol: 'arrow.triangle.branch', tone: 'accent' },
  scope: 'local',
  page: GROUPS_PAGE,
  default: 'group',
  options: [
    { value: 'private', label: 'Приватний чат' },
    { value: 'group', label: 'Група' },
    { value: 'both', label: 'Приватний чат і група' },
  ],
};

export const GROUPS_FALLBACK_PRIVATE_SETTING: SwitchSetting = {
  type: 'switch',
  key: GROUPS_FALLBACK_PRIVATE_KEY,
  label: 'Запасний приватний чат',
  hint: 'Сповіщення не дійшло в групу — надіслати його в приватний чат',
  icon: { symbol: 'arrow.uturn.backward', tone: 'accent' },
  scope: 'local',
  page: GROUPS_PAGE,
  default: true,
};

/** За замовчуванням увімкнено (рішення власника 2026-11-25); команди в групі приймаються лише від власника. */
export const GROUPS_COMMANDS_SETTING: SwitchSetting = {
  type: 'switch',
  key: GROUPS_COMMANDS_KEY,
  label: 'Команди в групі',
  hint: 'Бот слухає команди й кнопки в прив\'язаній групі, лише від власника',
  icon: { symbol: 'command', tone: 'accent' },
  scope: 'local',
  page: GROUPS_PAGE,
  default: true,
};

/** Статичні налаштування модуля; перемикачі `topic.<source>` додаються на кожне джерело сповіщень (`groupsTopicSetting`). */
export const GROUPS_UI_SETTINGS: SettingDefinition[] = [
  GROUPS_DELIVERY_SETTING,
  GROUPS_FALLBACK_PRIVATE_SETTING,
  GROUPS_COMMANDS_SETTING,
  statsPeriodSetting(GROUPS_STATS_PAGE),
];
