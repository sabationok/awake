import type { UiPage } from '@awake/contracts';
import type { BotNamespace } from '../../../bot';
import type { ModuleContext } from '../../types/mac-module';
import { botCommandSettingKey } from '../helpers/bot-command-setting-key';

/** «Команди»: які модулі бот зараз приймає в Telegram. Вимкнений зникає з меню команд і /start. */
export function buildBotCommandsPage(ctx: ModuleContext, namespaces: BotNamespace[]): UiPage {
  return {
    id: 'bot-commands',
    module: 'bot',
    title: 'Команди',
    icon: { symbol: 'command', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'commands',
        type: 'section',
        title: 'Команди Telegram',
        footer:
          'Вимкнений модуль зникає з меню команд і з /start, а бот не виконує ні його команду, ні кнопки зі старих повідомлень. Сповіщення налаштовуються на сторінці Telegram.',
        children: namespaces.map((ns) => ctx.settingNode(botCommandSettingKey(ns.namespace))),
      },
      {
        id: 'builtin',
        type: 'section',
        title: 'Завжди доступні',
        children: [
          { id: 'start', type: 'row', label: '/start', hint: 'Усі увімкнені модулі кнопками' },
          { id: 'help', type: 'row', label: '/help', hint: 'Список увімкнених команд' },
        ],
      },
    ],
  };
}
