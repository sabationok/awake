import type { SettingDefinition } from '@awake/contracts';
import { SLEEP_TIMER_OPTIONS } from './sleep-timer-options';

export const SLEEP_SETTINGS: SettingDefinition[] = [
  {
    type: 'select',
    key: 'minutes',
    label: 'Заснути через',
    default: '30',
    page: 'sleep-timer',
    options: SLEEP_TIMER_OPTIONS,
  },
];
