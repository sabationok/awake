import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestStatsMiddleware } from './middleware/request-stats.middleware';
import { ServerInfoService } from './services/server-info';

/** Знімок інстансу сервера для сторінки «Сервер» Mac-аппки і лічильники його запитів. */
@Module({ providers: [ServerInfoService] })
export class ServerInfoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestStatsMiddleware).forRoutes('*path');
  }
}
