import type { SettingValue } from '@awake/contracts';
import type { SeenBuild } from '../types/seen-build.types';

/** Збережений рядок JSON → остання показана збірка; нічого або сміття — null. */
export function parseSeenBuild(value: SettingValue | undefined): SeenBuild | null {
  if (typeof value !== 'string') return null;
  try {
    const seen = JSON.parse(value) as Partial<SeenBuild>;
    if (typeof seen.builtAt !== 'string' || typeof seen.version !== 'string') return null;
    return { version: seen.version, builtAt: seen.builtAt, ids: Array.isArray(seen.ids) ? seen.ids.filter((id) => typeof id === 'string') : [] };
  } catch {
    return null;
  }
}
