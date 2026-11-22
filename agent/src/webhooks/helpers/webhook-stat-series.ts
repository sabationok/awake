import { WEBHOOK_EVENTS_STAT_NS, WEBHOOK_STAT_SUBJECT } from '../constants/webhook-stats';

/** Серія подій одного вебхука в StatsService. */
export function webhookStatSeries(id: number) {
  return { namespace: WEBHOOK_EVENTS_STAT_NS, subjectType: WEBHOOK_STAT_SUBJECT, subjectId: String(id) };
}
