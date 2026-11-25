import { FindManyQueryBase } from '@nest-kit/sqlite';

export class FindManyGroupTopicsQuery extends FindManyQueryBase {
  groupId?: number;
  source?: string;
  closed?: boolean;
}
