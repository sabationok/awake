const FORMAT = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** «26 лист., 12:40» у часовому поясі Mac. */
export function formatWhen(iso: string): string {
  return FORMAT.format(new Date(iso));
}
