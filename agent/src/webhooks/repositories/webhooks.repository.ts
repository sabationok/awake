import { EntityRepository, SqliteRepository } from '@nest-kit/sqlite';
import { WebhookEntity } from '../entities/webhook.entity';
import { FindManyWebhooksQuery } from '../query/find-many-webhooks.query';
import { FindOneWebhookQuery } from '../query/find-one-webhook.query';

@EntityRepository(WebhookEntity)
export class WebhooksRepository extends SqliteRepository<WebhookEntity, FindOneWebhookQuery, FindManyWebhooksQuery> {}
