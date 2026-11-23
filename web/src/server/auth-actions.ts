'use server';
import { cookies } from 'next/headers';
import { STEP_PATH } from '@/features/redirects/redirect-flows';
import { redirect } from 'next/navigation';
import {
  IDLE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionValue,
  isValidPassword,
  parseIdleMinutes,
  touchSessionValue,
} from './session-cookie';
import { safeNextPath } from '@/features/redirects/safe-next';

export interface LoginState {
  error: string | null;
}

const cookieOptions = {
  httpOnly: true,
  // У next dev по HTTP у локальній мережі secure-кука не збережеться.
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const password = String(form.get('password') ?? '');
  if (!(await isValidPassword(password))) {
    // Пауза на кожну невдалу спробу сповільнює перебір.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: 'Невірний пароль' };
  }
  const idleMinutes = parseIdleMinutes(form.get('idle'));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionValue(idleMinutes), cookieOptions);
  // Не httpOnly: вкладка читає її, щоб розлогінитись після бездіяльності.
  jar.set(IDLE_COOKIE, String(idleMinutes), { ...cookieOptions, httpOnly: false });
  redirect(safeNextPath(form.get('next')));
}

/** Будь-яка дія користувача продовжує сесію на обраний час бездіяльності. */
export async function touchSession(): Promise<boolean> {
  const jar = await cookies();
  const next = await touchSessionValue(jar.get(SESSION_COOKIE)?.value);
  if (!next) return false;
  jar.set(SESSION_COOKIE, next, cookieOptions);
  return true;
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(IDLE_COOKIE);
  redirect(STEP_PATH.login);
}
