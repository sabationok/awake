import 'server-only';
import { readStage, type Stage } from './stage';

export type { Stage };

/** Залежності кожного stage: Web UI ходить лише в сервіси свого stage. Preview не ходить нікуди. */
const STAGE_DEPS: Record<Stage, { webhooxyUrl: string | null }> = {
  preview: { webhooxyUrl: null },
  dev: { webhooxyUrl: 'https://webhooks-proxy-dev.up.railway.app' },
  production: { webhooxyUrl: null },
};

/** Stage цього деплою з env середовища Vercel (`STAGE`); без dev / production — preview. */
export function readStageConfig(env: NodeJS.ProcessEnv = process.env) {
  const stage = readStage(env);
  // У preview webhooxy вимкнений навіть із WEBHOOXY_URL: жодних запитів до агента.
  const webhooxyUrl = stage === 'preview' ? null : env.WEBHOOXY_URL || STAGE_DEPS[stage].webhooxyUrl;
  return { stage, webhooxyUrl } as const;
}
