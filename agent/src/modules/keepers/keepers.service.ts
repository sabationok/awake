import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { Subject } from 'rxjs';
import { KEEPERS_PMSET_PATH, KEEPERS_PMSET_TIMEOUT_MS, KEEPERS_POLL_MS } from './constants/keepers';
import { parseAssertions } from './helpers/parse-assertions';
import type { Keeper } from './types/keeper.types';

/**
 * Хто тримає Mac без сну, крім наших сесій: Claude, браузер з відео, плеєр. Раз на `KEEPERS_POLL_MS` читає
 * утримання живлення macOS (`pmset -g assertions`, прав не треба). Лише читає: нічого не знімає і не ставить.
 */
@Injectable()
export class KeepersService implements OnModuleInit, OnModuleDestroy {
  /** Список утримувачів змінився (хтось з'явився або зник). */
  readonly changed$ = new Subject<void>();
  private readonly _logger = new Logger(KeepersService.name);
  private _keepers: Keeper[] = [];
  private _timer: NodeJS.Timeout | null = null;
  private _failed = false;

  onModuleInit() {
    void this._poll();
    this._timer = setInterval(() => void this._poll(), KEEPERS_POLL_MS);
    this._timer.unref();
  }

  onModuleDestroy() {
    if (this._timer) clearInterval(this._timer);
  }

  /** Останній прочитаний список, у порядку macOS. */
  keepers(): Keeper[] {
    return this._keepers;
  }

  private async _poll() {
    let output: string;
    try {
      output = await this._read();
      this._failed = false;
    } catch (error) {
      // Одна помилка в лог на серію збоїв, а не кожні 15 секунд.
      if (!this._failed) this._logger.warn(`pmset не відповів: ${(error as Error).message}`);
      this._failed = true;
      return;
    }
    const known = new Map(this._keepers.map((keeper) => [keeper.id, keeper]));
    // `since` рахується з лічильника macOS і стрибає на секунду між читаннями: тримаємо перше значення.
    const next = parseAssertions(output, Date.now()).map((keeper) => known.get(keeper.id) ?? keeper);
    const changed = next.length !== this._keepers.length || next.some((keeper, index) => keeper.id !== this._keepers[index].id);
    this._keepers = next;
    if (changed) this.changed$.next();
  }

  private _read(): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(KEEPERS_PMSET_PATH, ['-g', 'assertions'], { timeout: KEEPERS_PMSET_TIMEOUT_MS }, (error, stdout) => (error ? reject(error) : resolve(stdout)));
    });
  }
}
