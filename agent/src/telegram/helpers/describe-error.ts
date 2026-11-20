/** Текст помилки без токена: мережеві помилки fetch містять URL з токеном у шляху. */
export function describeError(error: unknown, token: string): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.split(token).join('[token]');
}
