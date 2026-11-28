import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { UiNotify } from '@macontrol/contracts';

/** Тости для всіх клієнтів (Mac socket, локальний web): текст вирішує сервер, канали лише доставляють. */
@Injectable()
export class UiNotifyService {
  readonly notify$ = new Subject<UiNotify>();

  notify(notify: UiNotify) {
    this.notify$.next(notify);
  }
}
