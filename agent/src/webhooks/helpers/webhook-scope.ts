/** Scope лічильників одного вебхука в MetricsService. */
export function webhookScope(id: number): string {
  return `webhook:${id}`;
}
