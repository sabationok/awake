import { StatGranularity } from '@awake/contracts';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Початок бакета (UTC). Одна копія для запису й читання. */
export function statPeriodStart(date: Date | number | string, granularity: StatGranularity): Date {
  const t = new Date(date).getTime();
  switch (granularity) {
    case StatGranularity.MINUTE:
      return new Date(Math.floor(t / MIN) * MIN);
    case StatGranularity.HOUR:
      return new Date(Math.floor(t / HOUR) * HOUR);
    case StatGranularity.DAY:
      return new Date(Math.floor(t / DAY) * DAY);
    case StatGranularity.WEEK: {
      const day = new Date(Math.floor(t / DAY) * DAY);
      return new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY);
    }
    case StatGranularity.MONTH: {
      const d = new Date(t);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    }
  }
}

export function statNextPeriodStart(start: Date, granularity: StatGranularity): Date {
  switch (granularity) {
    case StatGranularity.MINUTE:
      return new Date(start.getTime() + MIN);
    case StatGranularity.HOUR:
      return new Date(start.getTime() + HOUR);
    case StatGranularity.DAY:
      return new Date(start.getTime() + DAY);
    case StatGranularity.WEEK:
      return new Date(start.getTime() + 7 * DAY);
    case StatGranularity.MONTH:
      return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  }
}

/** Початки бакетів у [from, to); from округлено вниз. Обмежено, щоб поганий запит не виділив мільйони. */
export function statPeriodRange(from: Date | string, to: Date | string, granularity: StatGranularity, limit: number): Date[] {
  const end = new Date(to).getTime();
  const out: Date[] = [];
  for (let cur = statPeriodStart(from, granularity); cur.getTime() < end && out.length < limit; cur = statNextPeriodStart(cur, granularity)) {
    out.push(cur);
  }
  return out;
}
