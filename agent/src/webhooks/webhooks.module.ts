import { Global, Module } from '@nestjs/common';
import { WebhooksRepository } from './repositories/webhooks.repository';
import { WebhookChartsService } from './services/webhook-charts';
import { WebhooksListener, WebhooksService } from './services/webhooks';

/** Вебхуки webhooxy агента в SQLite. Глобальний: з нього бере свій DEST relay, а згодом Envify і разові посилання. */
@Global()
@Module({ providers: [WebhooksRepository, WebhooksService, WebhookChartsService, WebhooksListener], exports: [WebhooksService, WebhookChartsService] })
export class WebhooksModule {}
