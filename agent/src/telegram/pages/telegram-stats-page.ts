import type { UiChartPoint, UiPage, UiTone } from '@awake/contracts';
import { buildStatsPage } from '../../modules/helpers/build-stats-page';
import type { ModuleContext } from '../../modules/types/mac-module';
import type { StatsPeriodWindow } from '../../stats';
import { TELEGRAM_COMMANDS_METRIC, TELEGRAM_METRICS, TELEGRAM_STATS_PAGE } from '../constants/telegram-metrics';

const STATS: { metric: string; label: string; tone: UiTone }[] = [
  { metric: TELEGRAM_COMMANDS_METRIC, label: 'Команд і кнопок', tone: 'accent' },
  { metric: TELEGRAM_METRICS.denied, label: 'Відхилено (команда вимкнена)', tone: 'orange' },
  { metric: TELEGRAM_METRICS.notify, label: 'Сповіщень надіслано', tone: 'green' },
  { metric: TELEGRAM_METRICS.notifyFailed, label: 'Сповіщень не доставлено', tone: 'red' },
];

/** Telegram → Статистика: спільний лейаут статистики, графік і сума на кожен лічильник Telegram. */
export function buildTelegramStatsPage(ctx: ModuleContext, points: (metric: string, window: StatsPeriodWindow) => UiChartPoint[]): UiPage {
  return buildStatsPage(ctx, {
    id: TELEGRAM_STATS_PAGE,
    module: 'telegram',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    footer: 'Журнал усіх джерел — Агент → Журнал.',
    sections: [
      {
        id: 'charts',
        title: 'Графіки',
        charts: STATS.map(({ metric, label, tone }) => ({
          id: metric.replace(/\W+/g, '-'),
          title: label,
          tone,
          format: 'count' as const,
          total: true,
          points: (window: StatsPeriodWindow) => points(metric, window),
        })),
      },
    ],
  });
}
