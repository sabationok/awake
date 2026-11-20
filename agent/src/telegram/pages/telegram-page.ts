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
          'Кожен модуль додає свою команду: /awake (меню з кнопками), /awake_start 2h, /awake_stop, /awake_lock, /awake_screen. /status показує спільний стан Mac і модулів.',
        children: [ctx.settingNode('bot')],
      },
      {
        id: 'events',
        type: 'section',
        title: 'Сповіщення',
        children: [
          {
            id: 'events-tabs',
            type: 'tabs',
            tabs: [
              { id: 'awake', label: 'Awake', children: [ctx.settingNode('events.start'), ctx.settingNode('events.stop')] },
              {
                id: 'mac',
                label: 'Стан Mac',
                children: [
                  ctx.settingNode('events.power'),
                  ctx.settingNode('events.batteryLow'),
                  ctx.settingNode('events.thermal'),
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
