import type { StatGranularity, StatSeriesRef } from '@macontrol/contracts';

/** Ключ бакета в пам'яті: усі сегменти серії, гранулярність і початок періоду. */
export function statBucketKey(series: StatSeriesRef, granularity: StatGranularity, periodStart: Date): string {
  return JSON.stringify([series.namespace, series.subjectType, series.subjectId, series.seriesKey, granularity, periodStart.getTime()]);
}
