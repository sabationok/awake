import { EntityRepository, SqliteRepository } from '@nest-kit/sqlite';
import { GroupChatEntity } from '../entities/group-chat.entity';
import { FindManyGroupChatsQuery } from '../query/find-many-group-chats.query';
import { FindOneGroupChatQuery } from '../query/find-one-group-chat.query';

@EntityRepository(GroupChatEntity)
export class GroupChatsRepository extends SqliteRepository<GroupChatEntity, FindOneGroupChatQuery, FindManyGroupChatsQuery> {}
