import type { UiChart, UiChartPoint, UiIcon, UiNode, UiPage, UiRow, UiTone } from '@awake/contracts';
import { STATS_PAGE_PERIODS, STATS_PERIOD_KEY, statsPeriodWindow, type StatsPagePeriod, type StatsPeriodWindow } from '../../stats';
import type { ModuleContext } from '../types/mac-module';
import { formatDuration } from './format-duration';

/** Графік сторінки статистики: опис вузла і точки для вікна періоду вкладки. */
export interface StatsPageChart {
  /** Локальний id: вузол стане `<page>-<id>-<period>`. */
  id: string;
  title: string;
  tone?: UiTone;
  tones?: Record<string, UiTone>;
  format: NonNullable<UiChart['format']>;
  points(window: StatsPeriodWindow): UiChartPoint[];
  /** Сума за період у «Підсумку»: `true` — під назвою графіка, рядок — під цим підписом. */
  total?: boolean | string;
}

/** Секція графіків; `charts` може залежати від вікна (напр. найактивніші модулі за період). */
export interface StatsPageSection {
  id: string;
  title?: string;
  footer?: string;
  charts: StatsPageChart[] | ((window: StatsPeriodWindow) => StatsPageChart[]);
  /** Текст, коли графіків немає. */
  empty?: string;
}

/** Підсумок сторінки: суми графіків з `total` за вікно і (необов'язково) додаткові рядки з них. */
export type StatsPageTotals = Record<string, number>;

export interface StatsPageSpec {
  id: string;
  module: string;
  title: string;
  icon: UiIcon;
  scope?: UiPage['scope'];
  /** Ключ select-а з вибраною вкладкою (`statsPeriodSetting(page, key)` у налаштуваннях модуля). */
  periodKey?: string;
  sections: StatsPageSection[];
  /** Додаткові рядки «Підсумку» з сум (за id графіка), напр. «У середньому». Id рядка — локальний: період додається сам. */
  summary?: (totals: StatsPageTotals, window: StatsPeriodWindow) => UiRow[];
  /** Футер «Підсумку»: що саме рахує сторінка. */
  footer?: string;
}

/**
 * Спільний лейаут статистики й трекінгу: прилиплі вкладки періоду (Сьогодні · Дні · Тижні · Місяці) пишуть
 * налаштування сторінки; у кожній вкладці — «Підсумок» і секції графіків. Вкладки зібрані всі, тож перемикання
 * миттєве і у вебі; графіки Mac живі (ctx.liveChart). Списки (історія) — окремою сторінкою, не тут.
 */
export function buildStatsPage(ctx: ModuleContext, spec: StatsPageSpec): UiPage {
  const key = spec.periodKey ?? STATS_PERIOD_KEY;
  return {
    id: spec.id,
    module: spec.module,
    title: spec.title,
    icon: spec.icon,
    group: 'modules',
    ...(spec.scope ? { scope: spec.scope } : {}),
    children: [
      {
        id: `${spec.id}-period`,
        type: 'tabs',
        sticky: true,
        value: ctx.setting<string>(key),
        setting: { module: spec.module, key },
        tabs: STATS_PAGE_PERIODS.map(({ value, label }) => ({ id: value, label, children: periodNodes(ctx, spec, value) })),
      },
    ],
  };
}

function periodNodes(ctx: ModuleContext, spec: StatsPageSpec, period: StatsPagePeriod): UiNode[] {
  const window = statsPeriodWindow(period);
  const totals: StatsPageTotals = {};
  const totalRows: UiRow[] = [];
  const sections: UiNode[] = spec.sections.map((section) => {
    const charts = typeof section.charts === 'function' ? section.charts(window) : section.charts;
    const nodes = charts.map(({ id, total, points, ...chart }) => {
      const node = ctx.liveChart({ ...chart, id: `${spec.id}-${id}-${period}`, period, points });
      if (total) {
        totals[id] = node.points.reduce((sum, point) => sum + point.value, 0);
        totalRows.push({
          id: `${spec.id}-total-${id}-${period}`,
          type: 'row',
          label: typeof total === 'string' ? total : chart.title,
          value: chart.format === 'duration' ? formatDuration(totals[id] * 1000) : String(totals[id]),
        });
      }
      return node;
    });
    return {
      id: `${spec.id}-${section.id}-${period}`,
      type: 'section',
      ...(section.title ? { title: section.title } : {}),
      ...(section.footer ? { footer: section.footer } : {}),
      children: nodes.length ? nodes : [{ id: `${spec.id}-${section.id}-${period}-empty`, type: 'text', text: section.empty ?? 'Даних немає', tone: 'gray' }],
    };
  });
  const extra = (spec.summary?.(totals, window) ?? []).map((row) => ({ ...row, id: `${spec.id}-${row.id}-${period}` }));
  const rows = [...totalRows, ...extra];
  const summary: UiNode[] = rows.length
    ? [{ id: `${spec.id}-summary-${period}`, type: 'section', title: 'Підсумок', ...(spec.footer ? { footer: spec.footer } : {}), children: rows }]
    : [];
  return [...summary, ...sections];
}
