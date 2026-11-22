import { BeforeApplicationShutdown, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { STAT_FLUSH_MS, STAT_PRUNE_MS } from '../../constants/stat-limits';
import { StatsService } from './stats.service';

/** Flush раз на хвилину і перед зупинкою; прибирання старих бакетів раз на годину. */
@Injectable()
export class StatsScheduler implements OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown {
  private readonly _timers: NodeJS.Timeout[] = [];

  constructor(private readonly _stats: StatsService) {}

  onModuleInit() {
    this._stats.prune();
    this._timers.push(setInterval(() => this._stats.flush(), STAT_FLUSH_MS));
    this._timers.push(setInterval(() => this._stats.prune(), STAT_PRUNE_MS));
  }

  beforeApplicationShutdown() {
    this._stats.flush();
  }

  onModuleDestroy() {
    this._timers.forEach((timer) => clearInterval(timer));
  }
}
