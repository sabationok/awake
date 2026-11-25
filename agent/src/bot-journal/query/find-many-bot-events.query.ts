import { FindManyQueryBase } from '@nest-kit/sqlite';
import type { ModuleSource } from '../../modules/types/module-source';

export class FindManyBotEventsQuery extends FindManyQueryBase {
  source?: ModuleSource;
  namespace?: string;
  ok?: boolean;
}
