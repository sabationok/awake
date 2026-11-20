import type { MacState } from '@awake/contracts';
import type { BotMenu, ModuleBot, StatusFields } from '../../types/mac-module';

const VOLUME_LEVELS = ['0', '25', '50', '75', '100'];
/** Без 0%: чорний екран з телефона вже не повернути поглядом. */
const BRIGHTNESS_LEVELS = ['10', '25', '50', '75', '100'];

/** Поля «Екран і звук» у спільному /status. */
export function mediaStatus(mac: MacState | null): StatusFields | null {
  if (!mac) return null;
  return { volume: mac.volume, muted: mac.muted, brightness: mac.brightness };
}

/**
 * «Екран і звук» без своєї команди: відкривається з /awake або /start. Екрани: головний,
 * `volume` і `brightness` з рівнями на кнопках.
 */
export const MEDIA_BOT: ModuleBot = {
  description: '🔊 Екран і звук',
  menu: (ctx, screen) => {
    const mac = ctx.mac;
    if (!mac) return { text: '💤 Mac офлайн', buttons: [], back: { module: 'awake', screen: '' } };
    if (screen === 'volume') return levelScreen('🔊 Гучність', percent(mac.volume), 'volume', VOLUME_LEVELS);
    if (screen === 'brightness') return levelScreen('☀️ Яскравість', percent(mac.brightness), 'brightness', BRIGHTNESS_LEVELS);
    return mainScreen(mac);
  },
};

function mainScreen(mac: MacState): BotMenu {
  const volume = `${percent(mac.volume)}${mac.muted ? ' (без звуку)' : ''}`;
  return {
    text: `<b>🔊 Екран і звук</b>\nГучність: ${volume}\nЯскравість: ${percent(mac.brightness)}`,
    buttons: [
      [
        { label: '🔊 Гучність', go: { screen: 'volume' } },
        { label: '☀️ Яскравість', go: { screen: 'brightness' } },
      ],
      [{ label: mac.muted ? '🔈 Увімкнути звук' : '🔇 Без звуку', action: 'mute', params: { value: String(!mac.muted) } }],
    ],
    back: { module: 'awake', screen: '' },
  };
}

/** Рівень ставиться і лишає на цьому ж екрані, щоб підкрутити ще. */
function levelScreen(title: string, current: string, action: string, levels: string[]): BotMenu {
  return {
    text: `<b>${title}</b>\nЗараз: ${current}`,
    buttons: [levels.slice(0, 3), levels.slice(3)].map((row) =>
      row.map((value) => ({ label: `${value}%`, action, params: { value } })),
    ),
    back: { screen: '' },
  };
}

function percent(value: number | null | undefined): string {
  return value == null ? '—' : `${value}%`;
}
