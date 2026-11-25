import { UPDATE_BODY_LIMIT } from '../constants/app-update';
import type { BuildInfo } from '../types/build-info.types';
import type { SeenBuild } from '../types/seen-build.types';

/**
 * Що нового в цій збірці проти останньої показаної. Нова версія із закритим розділом CHANGELOG — цей розділ;
 * інакше записи змін, яких ще не показували. Нічого нового — порожній рядок.
 */
export function updateBody(info: BuildInfo, seen: SeenBuild | null): string {
  const known = new Set(seen?.ids ?? []);
  const fresh = info.changes.filter((change) => !known.has(change.id));
  const text =
    fresh.length > 0
      ? fresh.map((change) => `• ${change.text.trim()}`).join('\n')
      : info.released !== null && seen?.version !== info.version
        ? info.released.trim()
        : '';
  return text.length > UPDATE_BODY_LIMIT ? `${text.slice(0, UPDATE_BODY_LIMIT)}…` : text;
}
