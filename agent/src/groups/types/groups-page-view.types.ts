import type { GroupCapability, GroupProviderManifest } from '@awake/contracts';
import type { GroupChatEntity } from '../entities/group-chat.entity';
import type { GroupTopicRow } from './group-topic-row.types';

/** Усе, що сторінкам «Груп» треба знати про стан: будівники сторінок самі нічого не читають. */
export interface GroupsPageView {
  /** Прив'язана група (також якщо бот з неї вийшов) або null. */
  group: GroupChatEntity | null;
  /** Запити: бота додали, власник ще не вирішив. */
  pending: GroupChatEntity[];
  /** Неактивні: бот у групі, дозвіл на публікацію знято. */
  inactive: GroupChatEntity[];
  /** Чому зараз не можна створювати топіки; null — можна. */
  topicsBlocker: string | null;
  /** Конектор прив'язаної групи, а без групи — єдиний зареєстрований. */
  provider: GroupProviderManifest;
  /** Чи задекларував конектор можливість у маніфесті (`GroupsService.supports`). */
  supports(capability: GroupCapability): boolean;
  rows: GroupTopicRow[];
}
