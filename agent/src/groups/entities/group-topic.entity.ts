import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, StateDateColumn } from '@nest-kit/sqlite';

@Entity('group_topics')
@Index(['groupId'], { name: 'group_topics_group' })
export class GroupTopicEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'integer' }) groupId!: number;
  /** `message_thread_id` у Telegram. */
  @Column({ type: 'integer' }) threadId!: number;
  /** Id джерела сповіщень. */
  @Column({ type: 'text' }) source!: string;
  @Column({ type: 'text' }) name!: string;
  @StateDateColumn() closedAt!: string | null;
  @CreateDateColumn() createdAt!: string;
  /** Видалили в провайдері або ми. */
  @DeleteDateColumn() deletedAt!: string | null;
}
