import type { SettingDefinition } from '@awake/contracts';
import { WEB_UI_MODULE } from './web-ui';

/** Інтервал пульсу агента для Vercel у секундах; `off` — не слати. */
export const HEARTBEAT_OFF = 'off';

export const WEB_UI_SETTINGS: SettingDefinition[] = [
  {
    type: 'select',
    key: 'heartbeat',
    label: 'Пульс для Vercel',
    hint: 'Як часто сервер каже Vercel, що він живий. Дерево окремо: лише коли змінилось.',
    default: '300',
    page: WEB_UI_MODULE,
    scope: 'local',
    options: [
      { value: '60', label: 'Раз на хвилину' },
      { value: '300', label: 'Раз на 5 хв' },
      { value: '600', label: 'Раз на 10 хв' },
      { value: HEARTBEAT_OFF, label: 'Вимкнено' },
    ],
  },
];
