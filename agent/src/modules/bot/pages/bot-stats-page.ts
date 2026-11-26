import type { UiPage } from '@awake/contracts';
import type { BotNamespace } from '../../../bot';
import type { BotCallsChartsService } from '../../../bot-journal';
import { statSeriesTones } from '../../../stats';
import { buildStatsPage } from '../../helpers/build-stats-page';
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

/**
 * «Статистика»: спільний лейаут статистики — усі виклики нашого бота з усіх транспортів: разом і помилки, за
 * джерелом, через проксі і за модулем. Поточний бакет у Mac оновлюється live-тіками.
 */
export function buildBotStatsPage(ctx: ModuleContext, charts: BotCallsChartsService, namespaces: BotNamespace[], proxies: AgentProxy[]): UiPage {
  const sources = Object.fromEntries(SOURCES.map((source) => [source, BOT_SOURCE_LABEL[source]]));
  const proxyLabels = Object.fromEntries(proxies.map((proxy) => [proxy.id, proxyLabel(proxy)]));
  return buildStatsPage(ctx, {
    id: BOT_STATS_PAGE,
    module: 'bot',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    footer: 'Дії, екрани й налаштування з Mac, вебу (напряму й через проксі) і Telegram — усе, що йде через бота. Історія до stats-рушія є лише по днях.',
    sections: [
      {
        id: 'totals',
        title: 'Виклики',
        charts: [
          { id: 'total', title: 'Усього', tone: 'accent', format: 'count', total: 'Викликів', points: (window) => charts.total(window) },
          { id: 'errors', title: 'Помилок', tone: 'red', format: 'count', total: true, points: (window) => charts.errors(window) },
        ],
      },
      {
        id: 'by-source',
        title: 'За джерелом',
        charts: [{ id: 'sources', title: 'Джерела', tones: SOURCE_TONES, format: 'count', points: (window) => charts.bySource(window, sources) }],
      },
      {
        id: 'by-proxy',
        title: 'Через проксі',
        footer: 'Частина викликів джерела, що прийшла через проксі, а не напряму.',
        empty: 'Проксі немає',
        charts: proxies.length
          ? [
              {
                id: 'proxies',
                title: 'Через проксі',
                tones: statSeriesTones(Object.values(proxyLabels)),
                format: 'count',
                points: (window) => charts.byProxy(window, proxyLabels),
              },
            ]
          : [],
      },
      {
        id: 'by-module',
        title: 'За модулями',
        footer: `Найактивніші ${BOT_STATS_TOP_MODULES} модулів за період.`,
        charts: (window) => {
          const modules = charts.topModules(window, namespaces.map((ns) => ns.namespace), BOT_STATS_TOP_MODULES);
          return [{ id: 'modules', title: 'Модулі', tones: statSeriesTones(modules), format: 'count', points: (w) => charts.byModule(w, modules) }];
        },
      },
    ],
  });
}
