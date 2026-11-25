export class FindOneSessionQuery {
  id?: number;
  /** `false` — відкрита сесія (`endedAt IS NULL`). */
  ended?: boolean;
}
