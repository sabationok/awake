/**
 * Stage деплою з env (`STAGE`), не з NODE_ENV. Лише `dev` і `production` — справжні stage;
 * усе інше (немає змінної, `preview`, будь-яке інше значення) — preview: без запитів до агента і з тестовим входом.
 * Без 'server-only', бо його читає й session-cookie, яку імпортує форма входу.
 */
export type Stage = 'preview' | 'dev' | 'production';

export function readStage(env: NodeJS.ProcessEnv = process.env): Stage {
  return env.STAGE === 'dev' || env.STAGE === 'production' ? env.STAGE : 'preview';
}

export const isPreviewStage = (env: NodeJS.ProcessEnv = process.env) => readStage(env) === 'preview';
