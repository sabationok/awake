import { FindManyQueryBase } from '@nest-kit/sqlite';

export class FindManySleepTimersQuery extends FindManyQueryBase {
  ended?: boolean;
}
