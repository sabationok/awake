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
          'Кожен модуль має одну команду, далі все кнопками вглиб: /awake — сесія, /sleep → час або історія таймерів, /media → гучність і яскравість. /status — спільний стан Mac і модулів, /start — усі модулі.',
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
              { id: 'awake', label: 'Awake', children: [ctx.settingNode('events.awake.start'), ctx.settingNode('events.awake.stop')] },
              {
                id: 'sleep',
                label: 'Таймер сну',
                children: [ctx.settingNode('events.sleep.start'), ctx.settingNode('events.sleep.stop')],
              },
              {
                id: 'system',
                label: 'Стан Mac',
                children: [
                  ctx.settingNode('events.system.power'),
                  ctx.settingNode('events.system.batteryLow'),
                  ctx.settingNode('events.system.thermal'),
                ],
              },
              { id: 'relay', label: 'Relay', children: [ctx.settingNode('events.relay.status')] },
            ],
          },
        ],
      },
    ],
  };
}
