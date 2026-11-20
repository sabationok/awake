import type { MacState } from '@awake/contracts';
import type { ModuleBot, StatusFields } from '../../types/mac-module';

const PERCENT_PATTERN = /^\d{1,3}%?$/;

/** Поля «Екран і звук» у спільному /status. */
export function mediaStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return { volume: mac.volume, muted: mac.muted, brightness: mac.brightness };
}

/** /media: гучність і яскравість кнопками; /media_volume 40, /media_brightness 70, /media_mute. */
export const MEDIA_BOT: ModuleBot = {
  command: 'media',
  description: 'Екран і звук',
  menu: (ctx) => {
    const mac = ctx.mac;
    if (!mac) return { text: '💤 Mac офлайн', buttons: [] };
    const volume = mac.volume == null ? '—' : `${mac.volume}%${mac.muted ? ' (без звуку)' : ''}`;
    const brightness = mac.brightness == null ? '—' : `${mac.brightness}%`;
    return {
      text: `<b>🔊 Екран і звук</b>\nГучність: ${volume}\nЯскравість: ${brightness}`,
      buttons: [
        [0, 25, 50, 75].map((value) => ({ label: `🔊 ${value}%`, action: 'volume', params: { value: String(value) } })),
        [
          { label: mac.muted ? '🔈 Увімкнути звук' : '🔇 Без звуку', action: 'mute', params: { value: String(!mac.muted) } },
        ],
        [25, 50, 75, 100].map((value) => ({ label: `☀️ ${value}%`, action: 'brightness', params: { value: String(value) } })),
      ],
    };
  },
  commands: [
    {
      name: 'volume',
      description: 'Гучність 0–100 (/media_volume 40)',
      action: 'volume',
      reply: '🔊 Готово',
      arg: { param: 'value', pattern: PERCENT_PATTERN, required: true, invalid: 'Вкажи відсоток: /media_volume 40' },
    },
    { name: 'mute', description: 'Вимкнути або увімкнути звук', action: 'mute', reply: '🔇 Готово' },
    {
      name: 'brightness',
      description: 'Яскравість 0–100 (/media_brightness 70)',
      action: 'brightness',
      reply: '☀️ Готово',
      arg: { param: 'value', pattern: PERCENT_PATTERN, required: true, invalid: 'Вкажи відсоток: /media_brightness 70' },
    },
  ],
};
