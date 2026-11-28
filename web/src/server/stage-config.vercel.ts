import 'server-only';
import { uiKeys, uiNamespace, type UiNamespace } from '@awake/contracts';
import { isUpstashConfigured, upstashGet } from './upstash.vercel';

/**
 * Stage цього деплою Web UI з env (`STAGE`), не з NODE_ENV. Лише `dev` і `production` — справжні stage, усе інше — preview.
 * Індекс роутів і сторінки беруться лише з Upstash, з простору ключів свого stage (`contracts` `uiNamespace`):
 * production → `production`, dev → `dev`, preview → `br:<гілка деплою>`, а коли агент цієї гілки нічого не
 * опублікував — `dev` (owner, 2026-11-28). Без ключів Upstash — інтерфейсу немає, з причиною.
 */
export type Stage = 'preview' | 'dev' | 'production';

export function readStage(env: NodeJS.ProcessEnv = process.env): Stage {
  return env.STAGE === 'dev' || env.STAGE === 'production' ? env.STAGE : 'preview';
}

/** Простори ключів у порядку спроби. Гілку preview дає Vercel (`VERCEL_GIT_COMMIT_REF`). */
export function readNamespaces(env: NodeJS.ProcessEnv = process.env): UiNamespace[] {
  const stage = readStage(env);
  if (stage !== 'preview') return [stage];
  const branch = uiNamespace('dev', env.VERCEL_GIT_COMMIT_REF);
  return branch === 'dev' ? ['dev'] : [branch, 'dev'];
}

/** Причина, чому джерела немає, або `null`, коли Upstash можна читати. */
export function readStageConfig(env: NodeJS.ProcessEnv = process.env) {
  const stage = readStage(env);
  const namespaces = readNamespaces(env);
  const unavailable = isUpstashConfigured() ? null : 'Upstash не налаштовано в проєкті';
  return { stage, namespaces, unavailable } as const;
}

/** Перший простір, у якому є ключ: значення і простір (для пульсу й ETag з того самого простору). */
export async function readFirst(namespaces: UiNamespace[], key: (keys: ReturnType<typeof uiKeys>) => string) {
  for (const ns of namespaces) {
    const raw = await upstashGet(key(uiKeys(ns)));
    if (raw) return { raw, ns };
  }
  return null;
}
