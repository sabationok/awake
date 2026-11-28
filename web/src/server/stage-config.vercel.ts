import 'server-only';
import { isUpstashConfigured } from './upstash.vercel';

/**
 * Stage цього деплою Web UI з env (`STAGE`), не з NODE_ENV. Лише `dev` і `production` — справжні stage, усе інше — preview.
 * Індекс роутів і сторінки бере лише з Upstash, лише в dev / production і лише коли ключі є в проєкті. Preview
 * джерела не має: показує, що інтерфейсу немає, з причиною.
 */
export type Stage = 'preview' | 'dev' | 'production';

export function readStage(env: NodeJS.ProcessEnv = process.env): Stage {
  return env.STAGE === 'dev' || env.STAGE === 'production' ? env.STAGE : 'preview';
}

/** Причина, чому джерела немає, або `null`, коли Upstash можна читати. */
export function readStageConfig(env: NodeJS.ProcessEnv = process.env) {
  const stage = readStage(env);
  const unavailable =
    stage === 'preview' ? 'preview не читає Upstash' : isUpstashConfigured() ? null : 'Upstash не налаштовано в проєкті';
  return { stage, unavailable } as const;
}
