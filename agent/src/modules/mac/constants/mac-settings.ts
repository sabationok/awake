import type { SettingDefinition } from '@awake/contracts';

/** Коли сервер пише заміри (CPU, пам'ять, навантаження, нагрів) у статистику. */
export const METRICS_TRACKING_KEY = 'metricsTracking';
export const METRICS_TRACKING = { session: 'session', always: 'always' } as const;

export const MAC_SETTINGS: SettingDefinition[] = [
  {
    type: 'select',
    key: 'batteryWarn',
    label: 'Попередження про заряд',
    icon: { symbol: 'battery.25', tone: 'yellow' },
    page: 'status',
    default: '25',
    options: [
      { value: '15', label: '15%' },
      { value: '20', label: '20%' },
      { value: '25', label: '25%' },
      { value: '30', label: '30%' },
    ],
  },
  {
    type: 'select',
    key: METRICS_TRACKING_KEY,
    label: 'Заміри сервера і Mac',
    hint: "CPU, пам'ять, навантаження і нагрів раз на 10 с. Поза сесією графіки «Сервера» не поповнюються.",
    icon: { symbol: 'chart.xyaxis.line', tone: 'orange' },
    default: METRICS_TRACKING.session,
    options: [
      { value: METRICS_TRACKING.session, label: 'Лише під час сесії' },
      { value: METRICS_TRACKING.always, label: 'Завжди' },
    ],
  },
];
