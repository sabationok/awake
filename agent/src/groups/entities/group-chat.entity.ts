import type { GroupBotRights, GroupProviderId } from '@awake/contracts';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, StateDateColumn, UpdateDateColumn } from '@nest-kit/sqlite';

/**
 * Серед живих рядків (не відв'язаних) група провайдера одна і прив'язана одна: часткові унікальні індекси з міграції
 * `2026-11-25-009-groups-live-unique` (декоратор `@Index` часткових не описує).
 */
@Entity('group_chats')
@Index(['provider', 'externalId'], { name: 'group_chats_external' })
export class GroupChatEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'text' }) provider!: GroupProviderId;
  /** Id чату в провайдера, текстом (Telegram: `-100…`). */
  @Column({ type: 'text' }) externalId!: string;
  @Column({ type: 'text' }) title!: string;
  /** Id користувача провайдера, який додав бота. */
  @Column({ type: 'text' }) addedBy!: string;
  /** Знімок прав бота з події або з inspect. */
  @Column({ type: 'json' }) botRights!: GroupBotRights;
  /** Бачили, що в групі ввімкнені теми. */
  @StateDateColumn() topicsEnabledAt!: string | null;
  /** Запит: бота додали, власник ще не вирішив. Без `requestedAt` і `boundAt` група неактивна. */
  @StateDateColumn() requestedAt!: string | null;
  @StateDateColumn() boundAt!: string | null;
  /** Бот вийшов або його видалили. */
  @StateDateColumn() leftAt!: string | null;
  @CreateDateColumn() createdAt!: string;
  @UpdateDateColumn() updatedAt!: string | null;
  /** Відв'язали. */
  @DeleteDateColumn() deletedAt!: string | null;
}
