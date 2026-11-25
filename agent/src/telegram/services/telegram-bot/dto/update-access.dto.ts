import type { Chat, User } from 'telegraf/types';

/** Що middleware знає про оновлення, щоб вирішити, чи його обробляти. */
export class UpdateAccessDto {
  /** Id власника з telegram.env. */
  ownerId!: string;
  chat?: Chat;
  from?: User;
  /** Повідомлення від імені чату: анонімний адмін або канал. Особи немає. */
  senderChat?: Chat;
  isCallback!: boolean;
  /** Чат — прив'язана група, в якій бот зараз є. */
  isBoundGroup!: boolean;
  /** Чи слухати команди й кнопки в прив'язаній групі. */
  groupCommands!: boolean;
  /** Службове повідомлення «тему закрито / відкрито». */
  isTopicService!: boolean;
}
