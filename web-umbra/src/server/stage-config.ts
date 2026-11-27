import 'server-only';
import { isUpstashConfigured } from './upstash';

/**
 * Stage цього деплою Web Umbra з env (`STAGE`), не з NODE_ENV. Лише `dev` і `production` — справжні stage, усе інше — preview.
 * Звідки брати дерево, по черзі, поки якесь не дасть живе:
 * 1. Upstash — лише в dev / production і лише коли ключі є в проєкті;
 * 2. публічний роут Web Swift (старий Web UI, TEMP);
 * 3. вбудовані фікстури — завжди, щоб Umbra було що показати.
 */
export type Stage = 'preview' | 'dev' | 'production';

export type TreeSource = { kind: 'upstash' } | { kind: 'web-swift'; url: string };

/** Публічний роут Web Swift кожного stage. Production ще нема, тож і він дивиться на dev. */
const STAGE_WEB_SWIFT_TREE: Record<Stage, string> = {
  preview: 'https://macontrol-web-dev.vercel.app/api/public/ui-tree',
  dev: 'https://macontrol-web-dev.vercel.app/api/public/ui-tree',
  production: 'https://macontrol-web-dev.vercel.app/api/public/ui-tree',
};

export function readStage(env: NodeJS.ProcessEnv = process.env): Stage {
  return env.STAGE === 'dev' || env.STAGE === 'production' ? env.STAGE : 'preview';
}

export function readStageConfig(env: NodeJS.ProcessEnv = process.env) {
  const stage = readStage(env);
  const sources: TreeSource[] = [];
  if (stage !== 'preview' && isUpstashConfigured()) sources.push({ kind: 'upstash' });
  sources.push({ kind: 'web-swift', url: env.TREE_SOURCE_URL || STAGE_WEB_SWIFT_TREE[stage] });
  return { stage, sources } as const;
}
