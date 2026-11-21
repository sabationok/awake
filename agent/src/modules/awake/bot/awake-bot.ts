import type { MacState } from '@awake/contracts';
import { escapeHtml } from '../../../common/escape-html';
import { formatHhmm } from '../../../common/format-hhmm';
import type { BotMenu, ModuleBot, StatusFields } from '../../types/mac-module';

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
  };
}

/**
 * /awake — єдина команда модуля: стан сесії і кнопки.
 * Нові можливості додаються екранами, а не командами.
 */
export const AWAKE_BOT: ModuleBot = {
  command: 'awake',
  description: '☕️ Awake',
  menu: (ctx) => mainScreen(ctx.mac),
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
    ],
  };
}
