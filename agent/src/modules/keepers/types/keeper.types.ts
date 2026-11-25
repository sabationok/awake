/** Що саме процес не дає приспати: систему чи екран (а з ним і систему). */
export type KeeperKind = 'system' | 'display';

/** Процес, який зараз тримає Mac без сну (утримання живлення macOS). */
export interface Keeper {
  /** Id утримання в macOS: за ним пам'ятаємо, відколи його бачимо. */
  id: string;
  pid: number;
  process: string;
  kind: KeeperKind;
  /** Як процес сам назвав причину. */
  reason: string;
  /** ISO, відколи тримає (за лічильником macOS на момент першого читання). */
  since: string;
}
