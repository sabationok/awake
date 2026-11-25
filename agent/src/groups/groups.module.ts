import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { TelegramGroupProvider, TelegramGroupsProviderModule } from '../telegram/groups';
import { GroupsBindingService } from './groups-binding.service';
import { GroupsBot } from './groups.bot';
import { GroupsMacModule } from './groups.mac-module';
import { GroupsSettingsService } from './groups-settings.service';
import { GroupsService } from './groups.service';
import { GroupChatsRepository } from './repositories/group-chats.repository';
import { GroupTopicsRepository } from './repositories/group-topics.repository';
import { GROUP_PROVIDERS } from './constants/group-providers';
import type { GroupProvider } from './types/group-provider.types';

/**
 * Ядро «Груп»: прив'язана група, топіки джерел, адресати сповіщень, бот /groups. Про Telegraf не знає: конектори
 * приходять одним токеном `GROUP_PROVIDERS`, зібраним тут із модулів конекторів (зараз один — Telegram). Модуль
 * конектора не імпортує ні цей модуль, ні TelegramModule, тож циклу імпортів немає.
 */
@Module({
  // SettingsModule: ядро читає свої налаштування зі сховища (див. GroupsSettingsService).
  imports: [TelegramGroupsProviderModule, SettingsModule],
  providers: [
    GroupChatsRepository,
    GroupTopicsRepository,
    GroupsSettingsService,
    GroupsService,
    GroupsBindingService,
    GroupsMacModule,
    GroupsBot,
    { provide: GROUP_PROVIDERS, useFactory: (...providers: GroupProvider[]) => providers, inject: [TelegramGroupProvider] },
  ],
  exports: [GroupsService, GroupsBindingService, GroupsSettingsService, GroupsMacModule],
})
export class GroupsModule {}
