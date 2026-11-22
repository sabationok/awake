/** З чим host підключається до webhooxy: URL цього stage і чого бракує (секрети, вебхук relay). Значень тут немає. */
export interface RelayConnectionInfo {
  stage: string;
  url: string | null;
  /** Імена секретів і вебхуків, яких немає ніде. */
  missing: string[];
}
