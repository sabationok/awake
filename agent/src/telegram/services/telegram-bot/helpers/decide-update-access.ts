import type { UpdateAccessDto } from '../dto/update-access.dto';
import { isOwnerChat, isOwnerUser } from './is-owner-chat';

/**
 * `handle` — команда чи кнопка йде далі; `topicService` — лише стан топіка в ядро груп; `refuse` — чужа кнопка,
 * відповідь «Недоступно»; `silent` — нічого, навіть відповіді.
 */
export type UpdateAccess = 'handle' | 'topicService' | 'refuse' | 'silent';

/**
 * Хто може говорити з ботом. Приватний чат власника — як завжди. Прив'язана група — лише власник і лише від себе
 * (без `sender_chat`), якщо команди в групі ввімкнені; закриття й відкриття теми там рахується від будь-кого, бо це
 * стан нашого топіка, а не команда. Решта: кнопка отримує «Недоступно», повідомлення — тишу.
 */
export function decideUpdateAccess(dto: UpdateAccessDto): UpdateAccess {
  if (isOwnerChat(dto.chat, dto.from, dto.ownerId)) return 'handle';
  if (dto.isBoundGroup) {
    if (dto.isTopicService) return 'topicService';
    if (dto.groupCommands && dto.senderChat === undefined && isOwnerUser(dto.from, dto.ownerId)) return 'handle';
  }
  return dto.isCallback ? 'refuse' : 'silent';
}
