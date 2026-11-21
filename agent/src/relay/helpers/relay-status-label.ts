import type { UiTone } from '@awake/contracts';
import type { RelayStatus } from '../types/relay-status.types';

export const RELAY_STATUS_VIEW: Record<RelayStatus, { label: string; tone: UiTone }> = {
  off: { label: 'Вимкнено', tone: 'gray' },
  unconfigured: { label: 'Не налаштовано', tone: 'gray' },
  connecting: { label: 'Підключення', tone: 'yellow' },
  online: { label: 'Активний', tone: 'green' },
  offline: { label: 'Немає зв\'язку', tone: 'orange' },
  evicted: { label: 'Кімнату зайняв інший host', tone: 'red' },
  refused: { label: 'webhooxy відмовив', tone: 'red' },
};
