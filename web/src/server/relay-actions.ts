'use server';
import { cookies } from 'next/headers';
import type { RelayViewerAccess } from '@awake/contracts';
import { SESSION_COOKIE, isValidSession } from './session-cookie';
import { signRelayTicket } from './sign-relay-ticket';
import { readStageConfig } from './stage-config';

/** Пароль у Web UI один, тож і користувач один. */
const DASHBOARD_SUB = 'dashboard';

/**
 * Свіжий квиток viewer-а для кожного (пере)підключення до relay. Лише з дійсною сесією Web UI.
 * null — relay для цього деплою не налаштований (немає URL stage, ключа чи кімнати).
 */
export async function getRelayAccess(): Promise<RelayViewerAccess | null> {
  // Preview: webhooxyUrl там null, тож relay вимкнений і без цього рядка; тут — щоб це було видно.
  if (readStageConfig().stage === 'preview') return null;
  if (!(await isValidSession((await cookies()).get(SESSION_COOKIE)?.value))) return null;
  const { webhooxyUrl } = readStageConfig();
  // Ключ JWT аппки; старе ім'я — поки його не перейменували в Envify і Vercel.
  const key = process.env.MACONTROL_JWT_KEY || process.env.WEBHOOXY_JWT_TICKET_KEY;
  const room = process.env.WEBHOOXY_ROOM;
  const workspace = process.env.WEBHOOXY_WORKSPACE;
  if (!webhooxyUrl || !key || !room || !workspace) return null;
  return { url: webhooxyUrl, room, workspace, token: signRelayTicket(key, room, DASHBOARD_SUB) };
}
