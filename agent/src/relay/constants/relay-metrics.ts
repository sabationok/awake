/** Лічильники Webhooxy в журналі бота (bot_metrics, за день). */
export const RELAY_METRICS = {
  connects: 'relay.connects',
  viewerAllowed: 'relay.viewerAllowed',
  viewerDenied: 'relay.viewerDenied',
  messages: 'relay.messages',
  errors: 'relay.errors',
} as const;
