import 'server-only';
import { isUpstashConfigured } from './upstash';

/**
 * Stage цього деплою Umbra з env (`STAGE`), не з NODE_ENV. Лише `dev` і `production` — справжні stage, усе інше — preview.
 * Джерело дерева:
 * - preview: завжди публічний роут старого Web UI (TEMP);
 * - dev / production: Upstash напряму, а поки ключів Upstash у проєкті нема — теж старий Web UI (TEMP).
 */
export type Stage = 'preview' | 'dev' | 'production';

export type TreeSource = { kind: 'upstash' } | { kind: 'web'; url: string };

/** Публічний роут старого Web UI кожного stage. Production ще нема, тож і він дивиться на dev. */
const STAGE_WEB_TREE: Record<Stage, string> = {
  preview: 'https://macontrol-web-dev.vercel.app/api/public/ui-tree',
  dev: 'https://macontrol-web-dev.vercel.app/api/public/ui-tree',
  production: 'https://macontrol-web-dev.vercel.app/api/public/ui-tree',
};

export function readStage(env: NodeJS.ProcessEnv = process.env): Stage {
  return env.STAGE === 'dev' || env.STAGE === 'production' ? env.STAGE : 'preview';
}

export function readStageConfig(env: NodeJS.ProcessEnv = process.env) {
  const stage = readStage(env);
  const web: TreeSource = { kind: 'web', url: env.TREE_SOURCE_URL || STAGE_WEB_TREE[stage] };
  const tree: TreeSource = stage !== 'preview' && isUpstashConfigured() ? { kind: 'upstash' } : web;
  return { stage, tree } as const;
}
