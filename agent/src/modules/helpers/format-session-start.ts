/** Початок сесії: день, короткий місяць і час. */
export function formatSessionStart(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
