import type { MacState } from '@awake/contracts';
import { Bot, BotAction, BotCtx, BotParams, BotScreen, BotSource, type BotMenu, type BotParamValue } from '../../bot';
import { MACONTROL_BOT } from '../constants/macontrol-bot';
import type { ModuleContext } from '../types/mac-module';
import type { ModuleSource } from '../types/module-source';
import { parsePercent } from './helpers/parse-percent';

const VOLUME_LEVELS = ['0', '25', '50', '75', '100'];
/** Без 0%: чорний екран з телефона вже не повернути поглядом. */
const BRIGHTNESS_LEVELS = ['10', '25', '50', '75', '100'];

/** Гучність, звук і яскравість. /media: головний екран, `volume` і `brightness` з рівнями на кнопках. */
@Bot(MACONTROL_BOT, { namespace: 'media', command: 'media', description: '🔊 Екран і звук' })
export class MediaBot {
  @BotAction('volume')
  volume(@BotParams('value') raw: BotParamValue | undefined, @BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    const value = parsePercent(raw);
    if (value !== null) ctx.sendToMac({ action: 'volume', value }, source);
  }

  @BotAction('brightness')
  brightness(@BotParams('value') raw: BotParamValue | undefined, @BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    const value = parsePercent(raw);
    if (value !== null) ctx.sendToMac({ action: 'brightness', value }, source);
  }

  /** Без `value` перемикає поточний стан. */
  @BotAction('mute')
  mute(@BotParams('value') raw: BotParamValue | undefined, @BotCtx() ctx: ModuleContext, @BotSource() source: ModuleSource) {
    const value = raw === undefined ? !ctx.mac?.muted : raw === true || raw === 'true';
    ctx.sendToMac({ action: 'mute', value }, source);
  }

  @BotScreen()
  main(@BotCtx() { mac }: ModuleContext): BotMenu {
    if (!mac) return OFFLINE;
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
    };
  }

  @BotScreen('volume')
  volumeScreen(@BotCtx() { mac }: ModuleContext): BotMenu {
    return mac ? levelScreen('🔊 Гучність', percent(mac.volume), 'volume', VOLUME_LEVELS) : OFFLINE;
  }

  @BotScreen('brightness')
  brightnessScreen(@BotCtx() { mac }: ModuleContext): BotMenu {
    return mac ? levelScreen('☀️ Яскравість', percent(mac.brightness), 'brightness', BRIGHTNESS_LEVELS) : OFFLINE;
  }
}

const OFFLINE: BotMenu = { text: '💤 Mac офлайн', buttons: [] };

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

function percent(value: MacState['volume'] | undefined): string {
  return value == null ? '—' : `${value}%`;
}
