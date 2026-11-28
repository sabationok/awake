import type { UiChart, UiTone } from '@awake/contracts';

/** Ключ namespace-у статистики (value або status), як його показати: підпис серії і колір. */
export interface UiStatsKey {
  key: string;
  label: string;
  tone: UiTone;
}

/**
 * Namespace статистики, який модуль пише через StatsService. Ключі статичні: модуль перелічує їх руками.
 * Саме це поле пізніше може стати динамічним словником (ключі, зібрані на записі) — зараз лише літерал.
 */
export interface UiStatsNamespace {
  id: string;
  values: UiStatsKey[];
  statuses: UiStatsKey[];
}

/** Графік сторінки статистики. `id` унікальний на сторінці (починається з id сторінки). */
export interface UiStatsChart {
  id: string;
  title: string;
  namespace: string;
  /** Серія на кожне значення (статуси складено) або на кожен статус (значення складено). */
  by: 'value' | 'status';
  format: NonNullable<UiChart['format']>;
  /** Які ключі виміру `by` показати; без поля — всі задекларовані. */
  keys?: string[];
}

/** Фільтри сторінки статистики. `period` — ключ select-а періоду (`statsPeriodSetting(<page>)`). */
export interface UiStatsFilters {
  period: string;
  subject?: boolean;
  seriesKey?: boolean;
}

/**
 * Декларація статистики модуля для UI: не код запису, а опис того, що існує. Сторінка статистики будується з неї
 * (`buildStatsCharts`), запис лишається в сервісах модуля. Кожен ключ, який сервіс пише, задекларований тут.
 */
export interface UiModuleStats {
  /** Id сторінки статистики модуля. */
  page: string;
  namespaces: UiStatsNamespace[];
  charts: UiStatsChart[];
  filters: UiStatsFilters;
}
