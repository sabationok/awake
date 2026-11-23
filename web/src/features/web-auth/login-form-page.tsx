'use client';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WEB_SESSION_IDLE_OPTIONS, type WebSessionIdleMinutes } from '@awake/contracts';
import { Button } from '@/components/button';
import { FlexBox } from '@/components/flex';
import { Group } from '@/components/group';
import { PageFrame } from '@/components/page-frame';
import type { AgentError } from '@/features/pairing/agent-api';
import { pathForNext } from '@/features/redirects/next-step';
import { safeNextPath } from '@/features/redirects/safe-next';
import { webAuthApi } from './web-auth-api';

const DEFAULT_IDLE: WebSessionIdleMinutes = 5;

const ERROR_TEXT: Record<string, string> = {
  INVALID_PASSWORD: 'Неправильний пароль.',
  TOO_MANY_ATTEMPTS: 'Забагато спроб. Спробуй за 15 хвилин.',
  PASSWORD_NOT_SET: 'Пароль ще не задано. Задай його на Mac: MaControl → Підключення → «Ключі аппки» → «Пароль Web UI».',
};

/** Вхід паролем на сполученому пристрої. Пароль перевіряє агент на Mac; він же ставить `mc_session`. */
export function LoginFormPage() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'));
  const [password, setPassword] = useState('');
  const [idleMinutes, setIdleMinutes] = useState<WebSessionIdleMinutes>(DEFAULT_IDLE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await webAuthApi.login({ password, idleMinutes });
      router.replace(next);
    } catch (e) {
      const err = e as AgentError;
      // Пристрій не сполучений (немає mc_device): вхід паролем нічого не дасть, потрібен QR.
      if (err.next?.type === 'pair') return router.replace(pathForNext(err.next, next));
      setError(err.code ? (ERROR_TEXT[err.code] ?? err.message) : 'Сервер недоступний.');
      setPending(false);
    }
  };

  return (
    <PageFrame title="MaControl">
      <form onSubmit={submit}>
        <FlexBox gap="md">
          <Group footer={error ?? 'Пароль задається на Mac у «Ключах аппки», щонайменше 12 символів.'}>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Пароль"
              aria-label="Пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full bg-transparent px-4 text-[15px] outline-none placeholder:text-secondary"
            />
          </Group>
          <Group footer="Після цього часу без дій вхід гасне.">
            <select
              name="idle"
              value={idleMinutes}
              onChange={(event) => setIdleMinutes(Number(event.target.value) as WebSessionIdleMinutes)}
              aria-label="Вийти після бездіяльності"
              className="h-11 w-full bg-transparent px-4 text-[15px] outline-none"
            >
              {WEB_SESSION_IDLE_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  Вийти після {minutes} хв
                </option>
              ))}
            </select>
          </Group>
          <Button type="submit" variant="filled" disabled={pending || !password} className="h-11">
            Увійти
          </Button>
        </FlexBox>
      </form>
    </PageFrame>
  );
}
