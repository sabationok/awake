import type { Webhook } from '@awake/contracts';
import type { WebhookEntity } from '../entities/webhook.entity';

/** Entity → контракт: `updatedAt` / `disabledAt` у контракті опційні, `NULL` у БД — їх немає. */
export function toWebhook(entity: WebhookEntity): Webhook {
  return {
    id: entity.id,
    whId: entity.whId,
    provider: entity.provider,
    type: entity.type,
    mode: entity.mode,
    workspace: entity.workspace,
    destId: entity.destId,
    config: entity.config,
    createdAt: entity.createdAt,
    ...(entity.updatedAt ? { updatedAt: entity.updatedAt } : {}),
    ...(entity.disabledAt ? { disabledAt: entity.disabledAt } : {}),
  };
}
