import { Injectable } from '@nestjs/common';
import type { SleepTimerEvent } from '@macontrol/contracts';
import type { CloseSleepTimerDto } from './dto/close-sleep-timer.dto';
import type { CreateSleepTimerDto } from './dto/create-sleep-timer.dto';
import type { SleepTimerEntity } from './entities/sleep-timer.entity';
import { FindManySleepTimersQuery } from './query/find-many-sleep-timers.query';
import { SleepTimersRepository } from './repositories/sleep-timers.repository';

@Injectable()
export class SleepTimersService {
  constructor(private readonly _timers: SleepTimersRepository) {}

  /** start відкриває нову сесію таймера, stop закриває поточну з причиною. */
  applyEvent(event: SleepTimerEvent) {
    if (event.event === 'start') {
      // Незакритий таймер перед новим означає збій: аппку вбили, поки таймер ішов.
      this._closeOpen({ endedAt: event.at, endReason: 'перервано' });
      const dto: CreateSleepTimerDto = { startedAt: event.startedAt, sleepAt: event.sleepAt, minutes: event.minutes, source: event.source };
      this._timers.create(dto);
      return;
    }
    this._closeOpen({ endedAt: event.at, endReason: event.reason ?? null });
  }

  /** Від найновішого. */
  findMany(query: FindManySleepTimersQuery): SleepTimerEntity[] {
    return this._timers.findMany(query, { order: { startedAt: 'DESC' } });
  }

  private _closeOpen(dto: CloseSleepTimerDto) {
    this._timers.update({ ended: false }, dto);
  }
}
