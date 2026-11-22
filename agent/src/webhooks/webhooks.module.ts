import { Global, Module } from '@nestjs/common';
import { WebhooksRepository } from './repositories/webhooks.repository';
import { WebhooksListener, WebhooksService } from './services/webhooks';

/** Вебхуки webhooxy агента в SQLite. Глобальний: з нього бере свій DEST relay, а згодом Envify і разові посилання. */
@Global()
@Module({ providers: [WebhooksRepository, WebhooksService, WebhooksListener], exports: [WebhooksService] })
export class WebhooksModule {}
