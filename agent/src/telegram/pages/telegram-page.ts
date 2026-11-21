import type { UiNode, UiPage } from '@awake/contracts';
import type { BotNamespace } from '../../bot';
import type { BotMetrics } from '../../bot-journal';
import { formatSessionStart } from '../../modules/helpers/format-session-start';
import type { ModuleContext } from '../../modules/types/mac-module';
import { TELEGRAM_METRICS } from '../constants/telegram-metrics';
import { telegramCommandSettingKey } from '../helpers/telegram-command-setting-key';
import type { TelegramRunState } from '../types/telegram-run-state.types';

const STATS: { metric: string; label: string }[] = [
  { metric: 'src.telegram', label: 'Команд і кнопок' },
  { metric: TELEGRAM_METRICS.denied, label: 'Відхилено (команда вимкнена)' },
  { metric: TELEGRAM_METRICS.notify, label: 'Сповіщень надіслано' },
  { metric: TELEGRAM_METRICS.notifyFailed, label: 'Сповіщень не доставлено' },
];

/** Рядок «сьогодні / усього» на кожен лічильник Telegram. */
function statRows(metrics: BotMetrics): UiNode[] {
  return STATS.map(({ metric, label }) => ({
    id: `stat-${metric}`,
    type: 'row',
    label,
    value: `${metrics.today[metric] ?? 0} / ${metrics.total[metric] ?? 0}`,
  }));
}

export function buildTelegramPage(ctx: ModuleContext, namespaces: BotNamespace[], run: TelegramRunState, metrics: BotMetrics): UiPage {
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
            type: 'status',
            label: run.running ? 'Polling працює' : 'Polling зупинено',
            hint: run.since ? `з ${formatSessionStart(run.since)}` : 'Бот вимкнено або немає telegram.env',
            tone: run.running ? 'green' : 'gray',
            pulse: run.running,
          },
        ],
      },
      {
        id: 'commands',
        type: 'section',
        title: 'Команди Telegram',
        footer:
          'Які модулі нашого бота Telegram приймає. Вимкнений зникає з меню команд і /start, а бот не виконує ні його команду, ні кнопки зі старих повідомлень. Mac і веб це не обмежує. /start і /help доступні завжди.',
        children: namespaces.map((ns) => ctx.settingNode(telegramCommandSettingKey(ns.namespace))),
      },
      {
        id: 'stats',
        type: 'section',
        title: 'Статистика',
        footer: 'Сьогодні / усього. Повний журнал усіх джерел — у Bot → Журнал.',
        children: statRows(metrics),
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
