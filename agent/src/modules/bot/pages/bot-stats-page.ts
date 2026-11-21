import type { UiNode, UiPage } from '@awake/contracts';
import type { BotNamespace } from '../../../bot';
import type { BotMetrics } from '../../../bot-journal';
import type { ModuleSource } from '../../types/module-source';
import { BOT_SOURCE_LABEL } from '../constants/bot-source-labels';

const SOURCES: ModuleSource[] = ['mac', 'web', 'relay', 'telegram'];

/** «сьогодні / усього» для лічильника. */
function countValue(metrics: BotMetrics, metric: string): string {
  return `${metrics.today[metric] ?? 0} / ${metrics.total[metric] ?? 0}`;
}

function row(id: string, label: string, value: string, hint?: string): UiNode {
  return { id, type: 'row', label, value, hint };
}

/** «Статистика»: усі виклики нашого бота з усіх транспортів — разом, за джерелом і за модулем. */
export function buildBotStatsPage(metrics: BotMetrics, namespaces: BotNamespace[]): UiPage {
  return {
    id: 'bot-stats',
    module: 'bot',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'totals',
        type: 'section',
        title: 'Виклики',
        footer: 'Сьогодні / усього. Дії, екрани й налаштування з Mac, вебу, webhooxy і Telegram — усе, що йде через бота.',
        children: [row('total', 'Усього', countValue(metrics, 'total')), row('error', 'Помилок', countValue(metrics, 'error'))],
      },
      {
        id: 'by-source',
        type: 'section',
        title: 'За джерелом',
        children: SOURCES.map((source) => row(`src-${source}`, BOT_SOURCE_LABEL[source], countValue(metrics, `src.${source}`))),
      },
      {
        id: 'by-module',
        type: 'section',
        title: 'За модулями',
        children: namespaces.map((ns) => row(`ns-${ns.namespace}`, ns.namespace, countValue(metrics, `ns.${ns.namespace}`), ns.description)),
      },
    ],
  };
}
