import { Injectable } from '@nestjs/common';
import type { SleepTimerEvent, SleepTimerRecord } from '@awake/contracts';
import { SleepTimersRepository } from './repositories/sleep-timers.repository';

@Injectable()
export class SleepTimersService {
  constructor(private readonly _timers: SleepTimersRepository) {}

  /** start відкриває нову сесію таймера, stop закриває поточну з причиною. */
  applyEvent(event: SleepTimerEvent) {
    if (event.event === 'start') {
      // Незакритий таймер перед новим означає збій: аппку вбили, поки таймер ішов.
      this._timers.closeOpen({ endedAt: event.at, endReason: 'перервано' });
      this._timers.create({ startedAt: event.startedAt, sleepAt: event.sleepAt, minutes: event.minutes, source: event.source });
      return;
    }
    this._timers.closeOpen({ endedAt: event.at, endReason: event.reason ?? null });
  }

  findMany(query: { limit: number }): SleepTimerRecord[] {
    return this._timers.findMany(query);
  }
}
