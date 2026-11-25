/** Один запис змін із `.changeset` (ще не випущений) у паспорті збірки. */
export interface BuildChange {
  id: string;
  bump: string;
  text: string;
}

/** Паспорт збірки: `build-info.json` поруч з `agent.cjs`, пише `scripts/build-info.mjs`. */
export interface BuildInfo {
  version: string;
  stage: string;
  commit: string;
  builtAt: string;
  /** Зміни після останнього релізу (dev-збірки). */
  changes: BuildChange[];
  /** Розділ CHANGELOG.md цієї версії, якщо реліз уже закрив записи. */
  released: string | null;
}
