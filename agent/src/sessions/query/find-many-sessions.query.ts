import { FindManyQueryBase } from '@nest-kit/sqlite';

export class FindManySessionsQuery extends FindManyQueryBase {
  ended?: boolean;
}
