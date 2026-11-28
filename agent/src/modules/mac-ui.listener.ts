import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { UiLayoutRequest } from '@macontrol/contracts';
import { Subscription, debounceTime, merge } from 'rxjs';
import { MacBridgeService } from '../mac-bridge/services/mac-bridge.service';
import { TransportsService } from '../transports';
import { DOCK_PAGE_ID } from './constants/dock-page';
import { LiveChartsService } from './live-charts.service';
import { ModulesService } from './modules.service';
import type { LiveChartRegistry } from './types/live-chart.types';

/** Скільки останніх відкритих сторінок отримують зміни: аппка тримає їх у кеші, решта звіряється `ifRev` при переході. */
const WATCHED_PAGES = 4;

/**
 * SwiftUI-рендерер Mac-аппки (scope mac): індекс роутів одразу й при кожній зміні, сторінка — на `layout.get` і далі
 * при кожній зміні її `rev`, поки вона серед відкритих. Знімок налаштувань теж звідси. Натискання приходять з аппки
 * і виконуються як дії з джерелом mac.
 */
@Injectable()
export class MacUiListener implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(MacUiListener.name);
  private readonly _subscriptions: Subscription[] = [];
  private _shellRev = '';
  /** Відкриті сторінки (останні в кінці) → `rev`, який аппка вже має. */
  private readonly _watched = new Map<string, string>();
  /** Графіки кожної відкритої сторінки (id рядка → опис) з її останнього збирання. */
  private readonly _charts = new Map<string, LiveChartRegistry>();
  private _settingsSent = false;

  constructor(
    private readonly _bridge: MacBridgeService,
    private readonly _modules: ModulesService,
    private readonly _liveCharts: LiveChartsService,
    transports: TransportsService,
  ) {
    transports.register({
      id: 'mac',
      title: 'Mac',
      icon: { symbol: 'macbook', tone: 'accent' },
      status: () => ({ online: _bridge.state !== null, hint: _bridge.state?.host ?? 'Аппка мовчить' }),
    });
  }

  onModuleInit() {
    this._subscriptions.push(
      this._bridge.events$.subscribe((event) => void this._apply(event)),
      this._bridge.layoutRequests$.subscribe((request) => void this._open(request)),
      this._modules.settingChanged$.subscribe(() => this._bridge.sendSettings(this._modules.settingsSnapshot())),
      // Стан, журнал і сесії міняють індекс і сторінки; збираємо сплеск змін в одне оновлення.
      merge(this._bridge.state$, this._bridge.logs$, this._bridge.sessions$, this._modules.settingChanged$, this._modules.treeChanged$)
        .pipe(debounceTime(150))
        .subscribe(() => void this._push()),
    );
  }

  onModuleDestroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  private async _apply(event: Parameters<ModulesService['dispatch']>[0]) {
    try {
      await this._modules.dispatch(event, 'mac');
    } catch (error) {
      this._logger.warn(`event from Mac rejected: ${(error as Error).message}`);
    }
    await this._push();
  }

  /** `layout.get`: сторінка або `notModified`, і вона стає відкритою (отримує зміни). */
  private async _open({ pageId, ifRev }: UiLayoutRequest) {
    this._watched.delete(pageId);
    this._watched.set(pageId, ifRev ?? '');
    // Меню Dock не витісняється: аппка будує його з цієї сторінки в будь-який момент правого кліку.
    while ([...this._watched.keys()].filter((id) => id !== DOCK_PAGE_ID).length > WATCHED_PAGES) {
      const oldest = [...this._watched.keys()].find((id) => id !== DOCK_PAGE_ID) as string;
      this._watched.delete(oldest);
      this._charts.delete(oldest);
    }
    await this._pushPages([pageId], true);
  }

  private async _push() {
    // Перший стан від Mac: аппка щойно запустилась і ще не знає налаштувань.
    if (!this._settingsSent && this._bridge.state) {
      this._bridge.sendSettings(this._modules.settingsSnapshot());
      this._settingsSent = true;
    }
    const shell = await this._modules.buildShell('mac');
    if (shell.rev !== this._shellRev) {
      this._shellRev = shell.rev;
      this._bridge.sendShell(shell);
    }
    await this._pushPages([...this._watched.keys()], false);
  }

  /**
   * Збирає сторінки `ids` (scope mac) і шле ті, чий `rev` змінився. `answer` — це відповідь на `layout.get`:
   * той самий `rev` дає `notModified`, а не тишу. Графіки відкритих сторінок замінюють реєстр live-тіків.
   */
  private async _pushPages(ids: string[], answer: boolean) {
    for (const pageId of ids) {
      const charts: LiveChartRegistry = new Map();
      const page = await this._modules.buildPage(pageId, 'mac', charts);
      if (!page) {
        this._watched.delete(pageId);
        this._charts.delete(pageId);
        this._bridge.sendPageNotFound(pageId);
        continue;
      }
      this._charts.set(pageId, charts);
      if (page.rev !== this._watched.get(pageId)) {
        this._watched.set(pageId, page.rev);
        this._bridge.sendPage(page);
      } else if (answer) {
        this._bridge.sendPageNotModified(pageId, page.rev);
      }
    }
    this._liveCharts.replace(new Map([...this._charts.values()].flatMap((registry) => [...registry])));
  }
}
