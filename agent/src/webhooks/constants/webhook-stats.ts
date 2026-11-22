/** Події вебхука (relay: connects, messages, errors…): value — назва події, status — `count`. */
export const WEBHOOK_EVENTS_STAT_NS = 'webhook.events';
export const WEBHOOK_STAT_SUBJECT = 'webhook';

/** Підписи подій на графіках вебхука (ключі — `RELAY_METRICS`); подія без підпису йде під своїм ключем. */
export const WEBHOOK_EVENT_LABELS: Record<string, string> = {
  'relay.connects': 'Підключень',
  'relay.messages': 'Повідомлень',
  'relay.viewerAllowed': 'Viewer-ів пущено',
  'relay.viewerDenied': 'Viewer-ів не пущено',
  'relay.errors': 'Помилок',
};

/** Події-помилки: на картці — окремим графіком. */
export const WEBHOOK_ERROR_EVENTS = ['relay.errors'];
