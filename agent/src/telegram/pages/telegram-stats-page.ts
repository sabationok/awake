import type { UiChartPoint, UiPage, UiTone } from '@awake/contracts';
import { asStatsPeriod, STATS_PERIOD_KEY, type StatsPeriodWindow } from '../../stats';
import type { ModuleContext } from '../../modules/types/mac-module';
import { TELEGRAM_COMMANDS_METRIC, TELEGRAM_METRICS, TELEGRAM_STATS_PAGE } from '../constants/telegram-metrics';

const STATS: { metric: string; label: string; tone: UiTone }[] = [
  { metric: TELEGRAM_COMMANDS_METRIC, label: 'Команд і кнопок', tone: 'accent' },
  { metric: TELEGRAM_METRICS.denied, label: 'Відхилено (команда вимкнена)', tone: 'orange' },
  { metric: TELEGRAM_METRICS.notify, label: 'Сповіщень надіслано', tone: 'green' },
  { metric: TELEGRAM_METRICS.notifyFailed, label: 'Сповіщень не доставлено', tone: 'red' },
];

/** Telegram → Статистика: графік на кожен лічильник Telegram за вибраний період; у Mac поточний бакет живий. */
export function buildTelegramStatsPage(ctx: ModuleContext, points: (metric: string, window: StatsPeriodWindow) => UiChartPoint[]): UiPage {
  const period = asStatsPeriod(ctx.setting<string>(STATS_PERIOD_KEY));
  return {
    id: TELEGRAM_STATS_PAGE,
    module: 'telegram',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    group: 'modules',
    children: [
      { id: 'period', type: 'section', children: [ctx.settingNode(STATS_PERIOD_KEY)] },
      {
        id: 'stats',
        type: 'section',
        title: 'Статистика',
        footer: 'Журнал усіх джерел — Агент → Журнал.',
        children: STATS.map(({ metric, label, tone }) =>
          ctx.liveChart({ id: `${TELEGRAM_STATS_PAGE}-${metric}`, title: label, period, tone, format: 'count', points: (window) => points(metric, window) }),
        ),
      },
    ],
  };
}
