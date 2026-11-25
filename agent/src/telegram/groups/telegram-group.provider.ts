import { Injectable } from '@nestjs/common';
import type {
  EnsureGroupTopicDto,
  GroupInspection,
  GroupProvider,
  GroupTopicRef,
  InspectGroupDto,
  LeaveGroupDto,
  SendGroupMessageDto,
} from '../../groups';
import { TELEGRAM_GROUPS_MANIFEST } from './constants/telegram-groups-manifest';
import { toChatId } from './helpers/to-chat-id';
import { toGroupBotRights } from './helpers/to-group-bot-rights';
import { TelegramClientService } from './telegram-client.service';

/** Конектор груп Telegram: топіки форуму і відправка в них через Bot API запущеного бота. */
@Injectable()
export class TelegramGroupProvider implements GroupProvider {
  readonly manifest = TELEGRAM_GROUPS_MANIFEST;

  constructor(private readonly _client: TelegramClientService) {}

  /** Створює топік форуму з назвою джерела. Чи він уже є, знає ядро: сюди приходять лише по новий. */
  async ensureTopic(dto: EnsureGroupTopicDto): Promise<GroupTopicRef> {
    const topic = await this._client.call((api) => api.createForumTopic(toChatId(dto.chatId), dto.name));
    return { threadId: topic.message_thread_id };
  }

  async send(dto: SendGroupMessageDto): Promise<void> {
    await this._client.send({ chatId: dto.chatId, threadId: dto.threadId, html: dto.text });
  }

  async leave(dto: LeaveGroupDto): Promise<void> {
    await this._client.call((api) => api.leaveChat(toChatId(dto.chatId)));
  }

  /** Назва, чи ввімкнені теми (`is_forum`) і права бота (`getChatMember` себе). */
  async inspect(dto: InspectGroupDto): Promise<GroupInspection> {
    const chatId = toChatId(dto.chatId);
    return this._client.call(async (api) => {
      const chat = await api.getChat(chatId);
      const me = await api.getMe();
      const member = await api.getChatMember(chatId, me.id);
      return {
        title: 'title' in chat ? chat.title : dto.chatId,
        topicsEnabled: chat.type === 'supergroup' && chat.is_forum === true,
        botRights: toGroupBotRights(member),
      };
    });
  }
}
