'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionValue, isValidPassword } from './session-cookie';

export interface LoginState {
  error: string | null;
}

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const password = String(form.get('password') ?? '');
  if (!(await isValidPassword(password))) {
    // Пауза на кожну невдалу спробу сповільнює перебір.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: 'Невірний пароль' };
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionValue(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect('/');
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
