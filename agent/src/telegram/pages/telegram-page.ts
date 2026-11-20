import type { UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../modules/types/mac-module';

export function buildTelegramPage(ctx: ModuleContext): UiPage {
  return {
    id: 'telegram',
    module: 'telegram',
    title: 'Telegram',
    icon: { symbol: 'paperplane.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'bot',
        type: 'section',
        title: 'Бот',
        footer:
          'Команди /awake, /status, /start, /stop, /lock, /screen..',
        children: [ctx.settingNode('bot')],
      },
      {
        id: 'awake-events',
        type: 'section',
        title: 'Сповіщення · Awake',
        children: [ctx.settingNode('events.start'), ctx.settingNode('events.stop')],
      },
      {
        id: 'mac-events',
        type: 'section',
        title: 'Сповіщення · Стан Mac',
        children: [
          ctx.settingNode('events.power'),
          ctx.settingNode('events.batteryLow'),
          ctx.settingNode('events.thermal'),
        ],
      },
    ],
  };
}
