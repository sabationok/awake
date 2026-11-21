import { Module } from '@nestjs/common';
import { SleepTimersListener } from './sleep-timers.listener';
import { SleepTimersService } from './sleep-timers.service';
import { SleepTimersRepository } from './repositories/sleep-timers.repository';

/** Історія сесій таймера сну в SQLite. */
@Module({
  providers: [SleepTimersRepository, SleepTimersService, SleepTimersListener],
  exports: [SleepTimersService],
})
export class SleepTimersModule {}
