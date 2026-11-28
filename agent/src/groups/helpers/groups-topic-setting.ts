import type { SwitchSetting } from '@macontrol/contracts';
import { GROUPS_TOPICS_PAGE } from '../constants/groups-module';
import { GROUPS_TOPIC_KEY_PREFIX } from '../constants/groups-settings';
import type { GroupTopicSource } from '../types/group-topic-row.types';

/** Ключ перемикача «джерело має свій топік». */
export function groupsTopicSettingKey(source: string): string {
  return `${GROUPS_TOPIC_KEY_PREFIX}${source}`;
}

/** Id джерела з ключа `topic.<source>`; інший ключ — null. */
export function groupsTopicSettingSource(key: string): string | null {
  return key.startsWith(GROUPS_TOPIC_KEY_PREFIX) ? key.slice(GROUPS_TOPIC_KEY_PREFIX.length) : null;
}

/** Перемикач `topic.<source>`: увімкнено — джерело має свій топік; вимкнено — його сповіщення йдуть у General групи. */
export function groupsTopicSetting(source: GroupTopicSource): SwitchSetting {
  return {
    type: 'switch',
    key: groupsTopicSettingKey(source.id),
    label: `Топік «${source.label}»`,
    hint: source.viaMac
      ? 'Шле скрипт Mac: без топіка його сповіщення йдуть у приватний чат'
      : 'Вимкнено — сповіщення джерела йдуть у General групи',
    scope: 'local',
    page: GROUPS_TOPICS_PAGE,
    default: true,
  };
}
