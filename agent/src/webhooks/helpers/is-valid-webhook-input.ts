import type { WebhookInput } from '@awake/contracts';

const PROVIDERS = new Set(['macontrol', 'envify']);
const TYPES = new Set(['relay', 'envify', 'links']);
const MODES = new Set(['stream', 'oneshot']);
const SLUG = /^[A-Za-z0-9_.-]{1,128}$/;

/** Форма з аппки приходить по stdin без валідації: перевіряємо форму, перш ніж писати в SQLite. */
export function isValidWebhookInput(input: unknown): input is WebhookInput {
  if (!input || typeof input !== 'object') return false;
  const value = input as Partial<WebhookInput>;
  if (value.id !== undefined && !Number.isInteger(value.id)) return false;
  if (value.whId !== undefined && value.whId !== '' && (typeof value.whId !== 'string' || !SLUG.test(value.whId))) return false;
  if (!PROVIDERS.has(value.provider as string) || !TYPES.has(value.type as string) || !MODES.has(value.mode as string)) return false;
  if (typeof value.workspace !== 'string' || !SLUG.test(value.workspace)) return false;
  if (typeof value.destId !== 'string' || !SLUG.test(value.destId)) return false;
  const config = value.config;
  if (!config || typeof config !== 'object') return false;
  if (config.room !== undefined && (typeof config.room !== 'string' || !SLUG.test(config.room))) return false;
  // Кімната потрібна лише relay: без неї host не перевірить квиток viewer-а.
  if (value.type === 'relay' && !config.room) return false;
  return true;
}
