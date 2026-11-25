import { FindManyQueryBase } from '@nest-kit/sqlite';

export class FindManyWebSessionsQuery extends FindManyQueryBase {
  deviceId?: number;
  revoked?: boolean;
  /** Відкликані до цього часу або без руху з цього часу: кандидати на видалення. */
  staleBefore?: string;
}
