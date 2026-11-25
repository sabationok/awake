/** Рядок агрегату: одна клітинка value × status у бакеті. */
export interface StatCellRow {
  periodStart: string;
  value: string;
  status: string;
  count: number;
}

/** Сума клітинки за діапазон в одній серії. */
export interface StatSeriesCellRow {
  subjectType: string;
  subjectId: string | null;
  seriesKey: string;
  value: string;
  status: string;
  count: number;
}
