import type { UiPage } from '@awake/contracts';
import type { BotNamespace } from '../../bot';
import type { ModuleContext } from '../../modules/types/mac-module';
import { telegramCommandSettingKey } from '../helpers/telegram-command-setting-key';

/** Telegram → Команди: які модулі нашого бота Telegram як транспорт приймає. */
export function buildTelegramCommandsPage(ctx: ModuleContext, namespaces: BotNamespace[]): UiPage {
  return {
    id: 'telegram-commands',
    module: 'telegram',
    title: 'Команди',
    icon: { symbol: 'command', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'commands',
        type: 'section',
        title: 'Команди Telegram',
        footer:
          'Вимкнений модуль зникає з меню команд і /start, а бот не виконує ні його команду, ні кнопки зі старих повідомлень. Mac, веб і webhooxy це не обмежує. /start і /help доступні завжди.',
        children: namespaces.map((ns) => ctx.settingNode(telegramCommandSettingKey(ns.namespace))),
      },
    ],
  };
}
