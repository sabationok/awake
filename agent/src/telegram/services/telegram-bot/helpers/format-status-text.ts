import type { MacState } from '@awake/contracts';
import { BOT_TEXTS } from '../constants/bot-texts';
import { escapeHtml } from './escape-html';
import { formatHhmm } from './format-hhmm';

/** Стан Mac для Telegram: жирний заголовок і JSON полів у <pre>. */
export function formatStatusText(state: MacState | null): string {
  if (!state) return BOT_TEXTS.offline;
  const fields = {
    active: state.active,
    until: state.until ? formatHhmm(state.until) : null,
    battery: state.battery === null ? null : `${state.battery}%`,
    power: state.power,
    thermal: state.thermal,
  };
  return `<b>${escapeHtml(state.host)}</b>\n<pre>${escapeHtml(JSON.stringify(fields, null, 2))}</pre>`;
}
