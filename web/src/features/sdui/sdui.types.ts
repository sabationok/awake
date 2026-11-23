import type { UiEvent } from '@awake/contracts';

/** Куди нода шле свої події: зона секції тримає помилку і показує її в підписі. */
export type SduiEventHandler = (event: UiEvent) => Promise<void>;

/** Як Web UI на Vercel тримає зв'язок з Mac: напряму, через relay webhooxy (обидва з керуванням) або лише дерево з Upstash. */
export type SduiMode = 'direct' | 'relay' | 'readonly';

export interface NodeProps<T> {
  node: T;
  onEvent: SduiEventHandler;
}
