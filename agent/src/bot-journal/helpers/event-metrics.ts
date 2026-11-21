import type { BotEventCreate } from '../types/bot-event.types';

/** Які лічильники піднімає один виклик бота. */
export function eventMetrics(event: BotEventCreate): string[] {
  const metrics = ['total', `src.${event.source}`, `type.${event.type}`, `ns.${event.namespace}`];
  if (event.proxy) metrics.push(`proxy.${event.proxy}`);
  if (event.ok === false) metrics.push('error');
  return metrics;
}
