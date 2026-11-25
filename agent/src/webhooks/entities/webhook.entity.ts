import type { WebhookConfig, WebhookMode, WebhookProvider, WebhookType } from '@awake/contracts';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, StateDateColumn, UpdateDateColumn } from '@nest-kit/sqlite';

/** Вебхук агента. Видалені — soft delete: рядок лишається (`hasEverType` бачить його), пошук його не бачить. */
@Entity('webhooks')
export class WebhookEntity {
  @PrimaryGeneratedColumn() id!: number;
  /** `mt_id` у webhooxy. */
  @Column({ type: 'text' }) whId!: string;
  @Column({ type: 'text' }) provider!: WebhookProvider;
  @Column({ type: 'text' }) type!: WebhookType;
  @Column({ type: 'text' }) mode!: WebhookMode;
  @Column({ type: 'text' }) workspace!: string;
  @Column({ type: 'text' }) destId!: string;
  @Column({ type: 'json' }) config!: WebhookConfig;
  @CreateDateColumn() createdAt!: string;
  @UpdateDateColumn() updatedAt!: string | null;
  @StateDateColumn() disabledAt!: string | null;
  @DeleteDateColumn() deletedAt!: string | null;
}
