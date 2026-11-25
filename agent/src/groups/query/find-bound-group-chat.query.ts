import { FindOneGroupChatQuery } from './find-one-group-chat.query';

/** Прив'язана група: `bound` зафіксовано. Soft-deleted (відв'язані) пошук виключає сам. */
export class FindBoundGroupChatQuery extends FindOneGroupChatQuery {
  override bound: boolean = true;
}
