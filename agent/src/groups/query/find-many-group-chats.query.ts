import { FindManyQueryBase } from '@nest-kit/sqlite';

export class FindManyGroupChatsQuery extends FindManyQueryBase {
  provider?: string;
  bound?: boolean;
  /** `true` — чекає підтвердження власника (`requestedAt` не NULL). */
  requested?: boolean;
  left?: boolean;
}
