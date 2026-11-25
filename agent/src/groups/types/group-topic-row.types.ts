/** Джерело сповіщень, якому належить топік. `viaMac` — його події шле скрипт Mac, а не агент. */
export interface GroupTopicSource {
  id: string;
  label: string;
  viaMac?: boolean;
}

export interface GroupTopicRow {
  source: string;
  label: string;
  viaMac: boolean;
  /** Перемикач `topic.<source>`: чи має джерело свій топік. */
  enabled: boolean;
  /** Назва топіка в групі; null — топіка немає. */
  topic: string | null;
  state: 'active' | 'closed' | 'missing';
}
