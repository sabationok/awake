import type { SettingDefinition } from '@awake/contracts';
import { UNTIL_OPTIONS } from '../../constants/until-options';
import { SLEEP_TIMER_OPTIONS } from './sleep-timer-options';

/** Як у сесії Awake: вкладка «Період» (через скільки) або «Час» (о котрій). */
export const SLEEP_SETTINGS: SettingDefinition[] = [
  {
    type: 'select',
    key: 'minutes',
    label: 'Тривалість',
    default: '30',
    page: 'sleep-timer',
    options: SLEEP_TIMER_OPTIONS,
  },
  {
    type: 'select',
    key: 'mode',
    label: 'Як задати таймер',
    default: 'period',
    page: 'sleep-timer',
    options: [
      { value: 'period', label: 'Період' },
      { value: 'time', label: 'Час' },
    ],
  },
  {
    type: 'select',
    key: 'until',
    label: 'Заснути о',
    default: '01:00',
    page: 'sleep-timer',
    options: UNTIL_OPTIONS,
  },
];
