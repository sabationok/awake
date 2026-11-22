import { Global, Module } from '@nestjs/common';
import { MetricsRepository } from './repositories/metrics.repository';
import { MetricsService } from './services/metrics.service';

/** Лічильники зі scope (вебхуки тощо). Глобальний: рахують різні модулі. */
@Global()
@Module({ providers: [MetricsRepository, MetricsService], exports: [MetricsService] })
export class MetricsModule {}
