import type { UiNode, UiPage } from '@awake/contracts';
import type { BotMetrics } from '../../bot-journal';
import { TELEGRAM_METRICS } from '../constants/telegram-metrics';

const STATS: { metric: string; label: string }[] = [
  { metric: 'src.telegram', label: 'Команд і кнопок' },
  { metric: TELEGRAM_METRICS.denied, label: 'Відхилено (команда вимкнена)' },
  { metric: TELEGRAM_METRICS.notify, label: 'Сповіщень надіслано' },
  { metric: TELEGRAM_METRICS.notifyFailed, label: 'Сповіщень не доставлено' },
];

/** Telegram → Статистика: «сьогодні / усього» на кожен лічильник Telegram. */
export function buildTelegramStatsPage(metrics: BotMetrics): UiPage {
  const rows: UiNode[] = STATS.map(({ metric, label }) => ({
    id: `stat-${metric}`,
    type: 'row',
    label,
    value: `${metrics.today[metric] ?? 0} / ${metrics.total[metric] ?? 0}`,
  }));
  return {
    id: 'telegram-stats',
    module: 'telegram',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    group: 'modules',
    children: [
      { id: 'stats', type: 'section', title: 'Статистика', footer: 'Сьогодні / усього. Журнал усіх джерел — Агент → Журнал.', children: rows },
    ],
  };
}
