/** Усе, що вміє ядро модуля «Групи». Конектор маніфестує підмножину, яку реалізує; ядро читає маніфест і не питає по ходу. */
export type GroupCapability = 'topics' | 'pins' | 'inviteLinks' | 'members' | 'commands' | 'joinRequests';

export type GroupProviderId = 'telegram';

/** Маніфест конектора груп: що він підтримує і його ліміти. Виклик незадекларованої можливості — помилка. */
export interface GroupProviderManifest {
  id: GroupProviderId;
  title: string;
  capabilities: GroupCapability[];
  limits: GroupProviderLimits;
}

export interface GroupProviderLimits {
  /** Скільки повідомлень на хвилину дозволяє провайдер в одну групу. */
  messagesPerMinute: number;
}

/** Знімок прав бота в групі (нейтральний; конектор переводить права свого провайдера). */
export interface GroupBotRights {
  isAdmin: boolean;
  canManageTopics: boolean;
  canDeleteMessages: boolean;
  canPinMessages: boolean;
}
