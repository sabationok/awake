import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Subscription } from 'rxjs';
import { BotJournalService } from '../../../bot-journal';
import { ModulesService } from '../../modules.service';

/** Нове повідомлення бота або зміна його стану перебудовує сторінки: сторінки модуля Bot живі. */
@Injectable()
export class BotJournalListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _journal: BotJournalService,
    private readonly _modules: ModulesService,
  ) {}

  onModuleInit() {
    this._subscription = this._journal.changed$.subscribe(() => this._modules.treeChanged$.next());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }
}
