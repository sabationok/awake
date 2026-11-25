import { GroupSourceDto } from './group-source.dto';

export class RecreateGroupTopicDto extends GroupSourceDto {
  /** Thread id, у який не вдалося написати: якщо топік джерела вже інший, новий не створюється. */
  staleThreadId!: number;
}
