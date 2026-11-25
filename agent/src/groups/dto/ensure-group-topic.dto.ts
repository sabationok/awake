export class EnsureGroupTopicDto {
  chatId!: string;
  /** Id джерела сповіщень. */
  source!: string;
  /** Назва топіка. */
  name!: string;
}
