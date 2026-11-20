import type { UiEvent } from '@awake/contracts';

/** Куди нода шле свої події: зона секції тримає помилку і показує її в підписі. */
export type SduiEventHandler = (event: UiEvent) => Promise<void>;

/** Як дашборд на Vercel тримає зв'язок з Mac: напряму (керування) або лише дерево з Upstash. */
export type SduiMode = 'direct' | 'readonly';

export interface NodeProps<T> {
  node: T;
  onEvent: SduiEventHandler;
}
