import type { UiPage } from '@macontrol/contracts';
import { formatSessionStart } from '../../modules/helpers/format-session-start';
import type { ModuleContext } from '../../modules/types/mac-module';
import type { TelegramRunState } from '../types/telegram-run-state.types';

/** Головна вкладка Telegram: перемикач бота і стан polling-у. Команди, сповіщення і статистика — дочірні вкладки. */
export function buildTelegramPage(ctx: ModuleContext, run: TelegramRunState): UiPage {
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
        children: [
          ctx.settingNode('bot'),
          {
            id: 'run',
            type: 'item',
            title: 'Polling',
            status: run.running ? { label: 'Працює', tone: 'green', pulse: true } : { label: 'Зупинено', tone: 'gray' },
            comment: run.since ? `з ${formatSessionStart(run.since)}` : 'Бот вимкнено або немає telegram.env',
          },
        ],
      },
    ],
  };
}
