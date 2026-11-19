import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { LogRecord } from '@awake/contracts';
import { LogsRepository } from './repositories/logs.repository';

/** Журнал тримаємо 30 днів, як і Mac-аппка. */
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class LogsService implements OnModuleInit, OnModuleDestroy {
  private _pruneTimer?: NodeJS.Timeout;

  constructor(private readonly _logs: LogsRepository) {}

  onModuleInit() {
    this.prune();
    this._pruneTimer = setInterval(() => this.prune(), 6 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    clearInterval(this._pruneTimer);
  }

  create(data: { at: string; text: string }) {
    this._logs.create(data);
  }

  findMany(query: { limit: number }): LogRecord[] {
    return this._logs.findMany(query);
  }

  prune() {
    this._logs.deleteOlderThan(new Date(Date.now() - RETENTION_MS).toISOString());
  }
}
