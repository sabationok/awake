import { FindManyQueryBase, type FindValue } from '@nest-kit/sqlite';

export class FindManyLogsQuery extends FindManyQueryBase {
  at?: FindValue<string>;
}
