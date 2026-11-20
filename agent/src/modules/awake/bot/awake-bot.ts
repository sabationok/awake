import type { MacState } from '@awake/contracts';
import { escapeHtml } from '../../../common/escape-html';
import { formatHhmm } from '../../../common/format-hhmm';
import type { ModuleBot, StatusFields } from '../../types/mac-module';
import { DURATION_PATTERN } from '../constants/duration-pattern';

/** Швидкі тривалості під /awake. */
const QUICK_DURATIONS = [
  { duration: '1h', label: '1 год' },
  { duration: '2h', label: '2 год' },
  { duration: '4h', label: '4 год' },
];

/** Поля Awake у спільному /status: лише сесія. Стан Mac пише системний модуль. */
export function awakeStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return {
    awake: mac.active,
    until: mac.until ? formatHhmm(mac.until) : null,
    duration: mac.duration,
    sleepAt: mac.sleepAt ? formatHhmm(mac.sleepAt) : null,
  };
}

/** /awake: стан сесії і кнопки; /awake_start, /awake_stop… — те саме без меню. */
export const AWAKE_BOT: ModuleBot = {
  command: 'awake',
  description: 'Awake: сесія і кнопки',
  menu: (ctx) => {
    const fields = awakeStatus(ctx.mac);
    const text = fields
      ? `<b>☕️ Awake</b>\n<pre>${escapeHtml(JSON.stringify(fields, null, 2))}</pre>`
      : '💤 Mac офлайн';
    return {
      text,
      buttons: [
        QUICK_DURATIONS.map(({ duration, label }) => ({ label, action: 'start', params: { duration } })),
        [
          { label: 'Стоп', action: 'stop' },
          { label: 'Екран', action: 'displayOff' },
          { label: 'Замок', action: 'lock' },
        ],
      ],
    };
  },
  commands: [
    {
      name: 'start',
      description: 'Не спати (/awake_start 2h)',
      action: 'start',
      reply: '☕️ Запускаю…',
      arg: {
        param: 'duration',
        pattern: DURATION_PATTERN,
        invalid: 'Не зрозумів тривалість. Приклади: /awake_start 30m, /awake_start 2h, /awake_start 1d',
      },
    },
    { name: 'stop', description: 'Повернути сон', action: 'stop', reply: 'Повертаю сон…' },
    { name: 'lock', description: 'Заблокувати екран', action: 'lock', reply: 'Блокую екран…' },
    { name: 'screen', description: 'Погасити екран', action: 'displayOff', reply: 'Гашу екран…' },
    {
      name: 'sleep',
      description: 'Заснути через N хв (/awake_sleep 30, 0 скасовує)',
      action: 'sleepTimer',
      reply: '🌙 Таймер сну поставлено',
      arg: {
        param: 'value',
        pattern: /^\d{1,3}$/,
        required: true,
        invalid: 'Вкажи хвилини: /awake_sleep 30. /awake_sleep 0 скасовує таймер',
      },
    },
  ],
};
