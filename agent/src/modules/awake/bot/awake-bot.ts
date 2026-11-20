import type { MacState } from '@awake/contracts';
import { escapeHtml } from '../../../common/escape-html';
import { formatHhmm } from '../../../common/format-hhmm';
import type { BotMenu, ModuleBot, StatusFields } from '../../types/mac-module';
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

/** Таймер сну: хвилини на кнопках, по три в ряд. */
const SLEEP_MINUTES = [
  ['15', '30', '45'],
  ['60', '90', '120'],
];

/**
 * /awake: стан сесії і кнопки. Вглиб — екран `sleep` (таймер сну) і перехід у модуль «Екран і звук».
 * /awake_start, /awake_stop… — давні команди без меню; нових команд не додаємо, лише екрани.
 */
export const AWAKE_BOT: ModuleBot = {
  command: 'awake',
  description: '☕️ Awake',
  menu: (ctx, screen) => (screen === 'sleep' ? sleepScreen(ctx.mac) : mainScreen(ctx.mac)),
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
  ],
};

function mainScreen(mac: MacState | null): BotMenu {
  const fields = awakeStatus(mac);
  const text = fields ? `<b>☕️ Awake</b>\n<pre>${escapeHtml(JSON.stringify(fields, null, 2))}</pre>` : '💤 Mac офлайн';
  return {
    text,
    buttons: [
      QUICK_DURATIONS.map(({ duration, label }) => ({ label, action: 'start', params: { duration } })),
      [
        { label: 'Стоп', action: 'stop' },
        { label: 'Екран', action: 'displayOff' },
        { label: 'Замок', action: 'lock' },
      ],
      [
        { label: mac?.sleepAt ? `🌙 Сон о ${formatHhmm(mac.sleepAt)}` : '🌙 Таймер сну', go: { screen: 'sleep' } },
        { label: '🔊 Екран і звук', go: { module: 'media', screen: '' } },
      ],
    ],
  };
}

/** Вибір хвилин ставить таймер з нуля і повертає на головний екран Awake. */
function sleepScreen(mac: MacState | null): BotMenu {
  const state = mac?.sleepAt ? `Mac засне о ${formatHhmm(mac.sleepAt)}` : 'Таймера немає';
  const rows = SLEEP_MINUTES.map((row) =>
    row.map((value) => ({ label: `${value} хв`, action: 'sleepTimer', params: { value }, go: { screen: '' } })),
  );
  if (mac?.sleepAt) rows.push([{ label: 'Скасувати таймер', action: 'sleepTimer', params: { value: '0' }, go: { screen: '' } }]);
  return {
    text: `<b>🌙 Таймер сну</b>\n${state}\nЗасне, навіть якщо грає відео.`,
    buttons: rows,
    back: { screen: '' },
  };
}
