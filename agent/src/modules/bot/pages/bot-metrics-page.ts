import type { UiNode, UiPage } from '@awake/contracts';
import type { BotNamespace } from '../../../bot';
import type { BotMetrics, BotRunState } from '../../../bot-journal';
import { formatSessionStart } from '../../helpers/format-session-start';

const TOTALS: { metric: string; label: string }[] = [
  { metric: 'in.command', label: 'Команд' },
  { metric: 'in.button', label: 'Натискань кнопок' },
  { metric: 'out.notify', label: 'Сповіщень' },
  { metric: 'error', label: 'Помилок' },
  { metric: 'denied', label: 'Вимкнених команд' },
];

function countRows(prefix: string, counts: Record<string, number>): UiNode[] {
  return TOTALS.map(({ metric, label }) => ({ id: `${prefix}-${metric}`, type: 'row', label, value: String(counts[metric] ?? 0) }));
}

/** «Огляд»: стан polling-у, лічильники за сьогодні й за весь час, і по кожній команді. */
export function buildBotMetricsPage(run: BotRunState, metrics: BotMetrics, namespaces: BotNamespace[]): UiPage {
  return {
    id: 'bot-metrics',
    module: 'bot',
    title: 'Огляд',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'state',
        type: 'section',
        children: [
          {
            id: 'run',
            type: 'status',
            label: run.running ? 'Бот працює' : 'Бот зупинено',
            hint: run.since ? `з ${formatSessionStart(run.since)}` : 'Telegram вимкнено або немає telegram.env',
            tone: run.running ? 'green' : 'gray',
            pulse: run.running,
          },
        ],
      },
      { id: 'today', type: 'section', title: 'Сьогодні', children: countRows('today', metrics.today) },
      { id: 'total', type: 'section', title: 'Усього', children: countRows('total', metrics.total) },
      {
        id: 'by-command',
        type: 'section',
        title: 'За модулями',
        footer: 'Сьогодні / усього: команди й кнопки цього модуля.',
        children: namespaces.map((ns) => ({
          id: `ns-${ns.namespace}`,
          type: 'row',
          label: ns.command ? `/${ns.command}` : ns.namespace,
          hint: ns.description,
          value: `${metrics.today[`ns.${ns.namespace}`] ?? 0} / ${metrics.total[`ns.${ns.namespace}`] ?? 0}`,
        })),
      },
    ],
  };
}
