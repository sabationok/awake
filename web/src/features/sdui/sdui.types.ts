import type { UiEvent } from '@awake/contracts';

/** Куди нода шле свої події: зона секції тримає помилку і показує її в підписі. */
export type SduiEventHandler = (event: UiEvent) => Promise<void>;

export interface NodeProps<T> {
  node: T;
  onEvent: SduiEventHandler;
}
