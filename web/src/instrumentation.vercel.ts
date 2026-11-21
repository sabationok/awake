/**
 * Конфіг з Envify у process.env до першого запиту (лише збірка vercel: суфікс .vercel.ts).
 * Без ENVIFY_TOKEN нічого не робить — локально лишається .env.development.local.
 * Edge middleware цього не бачить: SESSION_SECRET має бути в env самого Vercel.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.ENVIFY_TOKEN) return;
  const { loadEnv } = await import('@envify/sdk');
  // Помилка завантаження валить cold start: без конфігу сервер не має працювати.
  const { scope, applied, errors } = await loadEnv({ override: process.env.ENVIFY_OVERRIDE === '1' });
  console.info(`[envify] ${applied.length} variables from ${scope.projectId}/${scope.environmentId}/${scope.serviceId}`);
  for (const error of errors) console.warn(`[envify] unresolved: ${error}`);
}
