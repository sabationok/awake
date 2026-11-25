import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { distinctUntilChanged, filter, map, merge, skip, startWith, type Subscription } from 'rxjs';
import { GROUPS_COMMANDS_KEY, GROUPS_MODULE, GroupsService } from '../../../groups';
import { ModulesService } from '../../../modules/modules.service';
import { TelegramGroupsListener } from '../../groups/telegram-groups.listener';
import { TelegramBotService } from './telegram-bot.service';

/** Запускає й зупиняє бота за налаштуванням telegram.bot і оновлює меню команд за перемикачами команд модуля Telegram. */
@Injectable()
export class TelegramBotListener implements OnModuleInit, OnModuleDestroy {
  private _subscription: Subscription | null = null;
  private _commandsSubscription: Subscription | null = null;
  private _groupSubscription: Subscription | null = null;

  constructor(
    private readonly _modules: ModulesService,
    private readonly _bot: TelegramBotService,
    private readonly _groups: GroupsService,
    private readonly _groupsListener: TelegramGroupsListener,
  ) {}

  onModuleInit() {
    if (this._modules.context('telegram').setting<boolean>('bot')) this._bot.start();
    this._subscription = this._modules.settingChanged$
      .pipe(filter((change) => change.module === 'telegram' && change.key === 'bot'))
      .subscribe((change) => (change.value === true ? this._bot.start() : this._bot.stop()));
    // Перемикачі команд у модулі Telegram: меню команд Telegram оновлюється одразу.
    this._commandsSubscription = this._modules.settingChanged$
      .pipe(filter((change) => change.module === 'telegram' && change.key.startsWith('commands.')))
      .subscribe(() => void this._bot.refreshCommands());
    // Групу прив'язали, відв'язали, бот із неї вийшов або перемкнули `groups.commands`: меню команд групи
    // (`BotCommandScopeChat`) оновлюється.
    const commandsSwitch$ = this._modules.settingChanged$.pipe(filter((change) => change.module === GROUPS_MODULE && change.key === GROUPS_COMMANDS_KEY));
    this._groupSubscription = merge(this._groups.changed$, commandsSwitch$)
      .pipe(
        map(() => this._groupsListener.commandsChatId()),
        startWith(this._groupsListener.commandsChatId()),
        distinctUntilChanged(),
        skip(1),
      )
      .subscribe(() => void this._bot.refreshCommands());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
    this._commandsSubscription?.unsubscribe();
    this._groupSubscription?.unsubscribe();
    this._bot.stop();
  }
}
