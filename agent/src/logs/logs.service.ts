import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LessThan } from '@nest-kit/sqlite';
import { CreateLogDto } from './dto/create-log.dto';
import type { LogEntity } from './entities/log.entity';
import { FindManyLogsQuery } from './query/find-many-logs.query';
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

  create(dto: CreateLogDto) {
    this._logs.create(dto);
  }

  /** Від найновішого. */
  findMany(query: FindManyLogsQuery): LogEntity[] {
    return this._logs.findMany(query, { order: { id: 'DESC' } });
  }

  prune() {
    this._logs.delete({ at: LessThan(new Date(Date.now() - RETENTION_MS).toISOString()) });
  }
}
