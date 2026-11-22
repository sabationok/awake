import { Global, Module } from '@nestjs/common';
import { MetricSnapshotsRepository } from './repositories/metric-snapshots.repository';
import { StatsScheduler, StatsService } from './services/stats';

/** Статистика (скіл nestjs-stats): namespace-и визначає модуль, що пише. Глобальний: пишуть різні модулі. */
@Global()
@Module({ providers: [MetricSnapshotsRepository, StatsService, StatsScheduler], exports: [StatsService] })
export class StatsModule {}
