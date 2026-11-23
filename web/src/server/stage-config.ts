import 'server-only';

export type Stage = 'dev' | 'production';

/** Залежності кожного stage: Web UI ходить лише в сервіси свого stage. */
const STAGE_DEPS: Record<Stage, { webhooxyUrl: string | null }> = {
  dev: { webhooxyUrl: 'https://webhooks-proxy-dev.up.railway.app' },
  production: { webhooxyUrl: null },
};

/** Stage цього деплою з env середовища Vercel (`STAGE`), не з NODE_ENV. */
export function readStageConfig(env: NodeJS.ProcessEnv = process.env) {
  const stage = env.STAGE ?? 'dev';
  if (stage !== 'dev' && stage !== 'production') throw new Error(`STAGE must be dev or production, got ${stage}`);
  return { stage, webhooxyUrl: env.WEBHOOXY_URL || STAGE_DEPS[stage].webhooxyUrl } as const;
}
