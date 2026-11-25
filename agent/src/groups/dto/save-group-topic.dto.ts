import type { GroupTopicEntity } from '../entities/group-topic.entity';

export class SaveGroupTopicDto implements Pick<GroupTopicEntity, 'groupId' | 'threadId' | 'source' | 'name'> {
  groupId!: number;
  threadId!: number;
  source!: string;
  name!: string;
}
