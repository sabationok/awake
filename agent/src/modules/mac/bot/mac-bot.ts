import type { MacState } from '@awake/contracts';
import { escapeHtml } from '../../../common/escape-html';
import type { ModuleBot, StatusFields } from '../../types/mac-module';

/** Поля системного модуля в спільному /status. */
export function macStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return {
    sleepBlocked: mac.sleepBlocked,
    battery: mac.battery === null ? null : `${mac.battery}%`,
    power: mac.power,
    thermal: mac.thermal,
    lidClosed: mac.lidClosed,
  };
}

/** /status: увесь спільний стан, у який пишуть і система, і Awake (awake, until…). */
export const MAC_BOT: ModuleBot = {
  command: 'status',
  description: 'Стан Mac і модулів',
  menu: (ctx) => {
    if (!ctx.mac) return { text: '💤 Mac офлайн', buttons: [] };
    return {
      text: `<b>${escapeHtml(ctx.mac.host)}</b>\n<pre>${escapeHtml(JSON.stringify(ctx.status(), null, 2))}</pre>`,
      buttons: [],
    };
  },
};
