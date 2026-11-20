import type { SettingDefinition } from '@awake/contracts';

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
  },];
