import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { BUILD_INFO_FILE } from '../constants/app-update';
import type { BuildInfo } from '../types/build-info.types';

/** Паспорт збірки поруч із запущеним `agent.cjs`. Немає файла або він зіпсований — null (запуск з джерел). */
export function readBuildInfo(): BuildInfo | null {
  const path = process.env.MACONTROL_BUILD_INFO || join(dirname(process.argv[1] ?? ''), BUILD_INFO_FILE);
  try {
    const info = JSON.parse(readFileSync(path, 'utf8')) as Partial<BuildInfo>;
    if (typeof info.version !== 'string' || typeof info.builtAt !== 'string') return null;
    return {
      version: info.version,
      stage: typeof info.stage === 'string' ? info.stage : 'dev',
      commit: typeof info.commit === 'string' ? info.commit : '',
      branch: typeof info.branch === 'string' ? info.branch : '',
      builtAt: info.builtAt,
      changes: Array.isArray(info.changes) ? info.changes.filter((item) => typeof item?.id === 'string' && typeof item?.text === 'string') : [],
      released: typeof info.released === 'string' ? info.released : null,
    };
  } catch {
    return null;
  }
}
