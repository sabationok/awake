import type { GroupTarget } from '../../../groups';

export class DeliverGroupMessageDto {
  target!: GroupTarget;
  /** Джерело сповіщення: за ним шукається новий топік, якщо старий видалили. */
  source!: string;
  html!: string;
}
