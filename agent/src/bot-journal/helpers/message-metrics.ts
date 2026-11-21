import type { BotMessageCreate } from '../types/bot-message.types';

/** Які лічильники піднімає одне повідомлення журналу. */
export function messageMetrics(message: BotMessageCreate): string[] {
  const metrics = [`${message.direction}.${message.type}`];
  if (message.namespace) metrics.push(`ns.${message.namespace}`);
  if (message.error === 'denied') metrics.push('denied');
  else if (message.ok === false) metrics.push('error');
  return metrics;
}
