import type { StatsPeriod, UiNode, UiPage } from '@awake/contracts';
import type { BotNamespace } from '../../../bot';
import type { BotCallsChartsService } from '../../../bot-journal';
import { asStatsPeriod, STATS_PERIOD_KEY, statSeriesTones, statsPeriodWindow } from '../../../stats';
import type { AgentProxy } from '../../../transports';
import type { ModuleContext } from '../../types/mac-module';
import type { ModuleSource } from '../../types/module-source';
import { BOT_SOURCE_LABEL } from '../constants/bot-source-labels';
import { BOT_STATS_PAGE, BOT_STATS_TOP_MODULES } from '../constants/bot-stats-page';

const SOURCES: ModuleSource[] = ['mac', 'web', 'telegram'];
const SOURCE_TONES = { [BOT_SOURCE_LABEL.mac]: 'accent', [BOT_SOURCE_LABEL.web]: 'green', [BOT_SOURCE_LABEL.telegram]: 'indigo' } as const;

/** «Tailscale → Веб»: проксі разом з джерелом, до якого він веде. */
function proxyLabel(proxy: AgentProxy): string {
  return `${proxy.title} → ${BOT_SOURCE_LABEL[proxy.via]}`;
}

function proxyNodes(ctx: ModuleContext, charts: BotCallsChartsService, period: StatsPeriod, proxies: AgentProxy[]): UiNode[] {
  if (proxies.length === 0) return [{ id: `${BOT_STATS_PAGE}-no-proxies`, type: 'text', text: 'Проксі немає' }];
  const labels = Object.fromEntries(proxies.map((proxy) => [proxy.id, proxyLabel(proxy)]));
  return [
    ctx.liveChart({
      id: `${BOT_STATS_PAGE}-proxies`,
      title: 'Через проксі',
      period,
      tones: statSeriesTones(Object.values(labels)),
      format: 'count',
      points: (window) => charts.byProxy(window, labels),
    }),
  ];
}

/**
 * «Статистика»: усі виклики нашого бота з усіх транспортів графіками за вибраний період — разом і помилки,
 * за джерелом, через проксі і за модулем. Поточний бакет у Mac оновлюється live-тіками.
 */
export function buildBotStatsPage(ctx: ModuleContext, charts: BotCallsChartsService, namespaces: BotNamespace[], proxies: AgentProxy[]): UiPage {
  const period = asStatsPeriod(ctx.setting<string>(STATS_PERIOD_KEY));
  const sources = Object.fromEntries(SOURCES.map((source) => [source, BOT_SOURCE_LABEL[source]]));
  const modules = charts.topModules(statsPeriodWindow(period), namespaces.map((ns) => ns.namespace), BOT_STATS_TOP_MODULES);
  return {
    id: BOT_STATS_PAGE,
    module: 'bot',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    group: 'modules',
    children: [
      { id: 'period', type: 'section', children: [ctx.settingNode(STATS_PERIOD_KEY)] },
      {
        id: 'totals',
        type: 'section',
        title: 'Виклики',
        footer: 'Дії, екрани й налаштування з Mac, вебу (напряму й через проксі) і Telegram — усе, що йде через бота. Історія до stats-рушія є лише по днях, тож вона видна в 7 і 30 днях.',
        children: [
          ctx.liveChart({ id: `${BOT_STATS_PAGE}-total`, title: 'Усього', period, tone: 'accent', format: 'count', points: (window) => charts.total(window) }),
          ctx.liveChart({ id: `${BOT_STATS_PAGE}-errors`, title: 'Помилок', period, tone: 'red', format: 'count', points: (window) => charts.errors(window) }),
        ],
      },
      {
        id: 'by-source',
        type: 'section',
        title: 'За джерелом',
        children: [
          ctx.liveChart({
            id: `${BOT_STATS_PAGE}-sources`,
            title: 'Джерела',
            period,
            tones: SOURCE_TONES,
            format: 'count',
            points: (window) => charts.bySource(window, sources),
          }),
        ],
      },
      {
        id: 'by-proxy',
        type: 'section',
        title: 'Через проксі',
        footer: 'Частина викликів джерела, що прийшла через проксі, а не напряму.',
        children: proxyNodes(ctx, charts, period, proxies),
      },
      {
        id: 'by-module',
        type: 'section',
        title: 'За модулями',
        footer: `Найактивніші ${BOT_STATS_TOP_MODULES} модулів за період.`,
        children: [
          ctx.liveChart({
            id: `${BOT_STATS_PAGE}-modules`,
            title: 'Модулі',
            period,
            tones: statSeriesTones(modules),
            format: 'count',
            points: (window) => charts.byModule(window, modules),
          }),
        ],
      },
    ],
  };
}
