import { EntityRepository, SqliteRepository } from '@nest-kit/sqlite';
import { GroupTopicEntity } from '../entities/group-topic.entity';
import { FindManyGroupTopicsQuery } from '../query/find-many-group-topics.query';
import { FindOneGroupTopicQuery } from '../query/find-one-group-topic.query';

@EntityRepository(GroupTopicEntity)
export class GroupTopicsRepository extends SqliteRepository<GroupTopicEntity, FindOneGroupTopicQuery, FindManyGroupTopicsQuery> {}
