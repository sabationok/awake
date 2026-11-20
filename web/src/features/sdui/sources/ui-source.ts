import type { UiEvent, UiTree } from '@awake/contracts';

/**
 * Звідки береться дерево: локальний агент на Mac (читання і дії) або Vercel (лише читання).
 * Без `send` рендерер вимикає всі керувальні елементи.
 */
export interface UiSource {
  load(): Promise<UiTree | null>;
  send?(event: UiEvent): Promise<void>;
}
