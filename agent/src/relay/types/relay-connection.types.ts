import type { SecretSource } from '@awake/contracts';
import type { RelayEnv } from './relay-env.types';

/** Звідки взявся ключ relay: process.env, Envify, relay.env, або його немає. */
export type RelayEnvKeySource = SecretSource;

/** Один ключ relay для сторінки Webhooxy. Секрети без значення: лише чи задано і звідки. */
export interface RelayConnectionKey {
  field: keyof RelayEnv;
  /** Ім'я змінної (`WEBHOOXY_DEST_ID`). */
  name: string;
  source: RelayEnvKeySource;
  secret: boolean;
  /** Значення несекретного ключа; для секретів завжди null. */
  value: string | null;
}

/** З чим host підключається до webhooxy: URL цього stage і ключі з relay.env / Envify / process.env. */
export interface RelayConnectionInfo {
  stage: string;
  url: string | null;
  /** Шлях до relay.env, який читав агент. */
  envPath: string;
  keys: RelayConnectionKey[];
}
