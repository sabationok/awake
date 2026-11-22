import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestStatsMiddleware } from './middleware/request-stats.middleware';
import { ServerChartsListener, ServerChartsService } from './services/server-charts';
import { ServerInfoService } from './services/server-info';

/** Знімок інстансу сервера для сторінки «Сервер» Mac-аппки, лічильники запитів, заміри процесу і їхні графіки. */
@Module({ providers: [ServerInfoService, ServerChartsService, ServerChartsListener] })
export class ServerInfoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestStatsMiddleware).forRoutes('*path');
  }
}
