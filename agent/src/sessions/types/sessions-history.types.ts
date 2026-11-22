/** Один період таймлайну сесій. */
export interface SessionsPeriod {
  /** Початок періоду: локальна північ для днів, UTC для тижнів і місяців. */
  start: Date;
  count: number;
  seconds: number;
}

export interface SessionsHistory {
  days: SessionsPeriod[];
  weeks: SessionsPeriod[];
  months: SessionsPeriod[];
}
