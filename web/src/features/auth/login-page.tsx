'use client';
import { useActionState } from 'react';
import { Button } from '@/components/button';
import { FlexBox } from '@/components/flex';
import { Group } from '@/components/group';
import { PageFrame } from '@/components/page-frame';
import { login, type LoginState } from '@/server/auth-actions';
import { DEFAULT_IDLE_MINUTES, IDLE_OPTIONS_MINUTES } from '@/server/session-cookie';

export function LoginPage({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });

  return (
    <PageFrame title="MaControl">
      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <FlexBox gap="md">
          <Group footer={state.error ?? 'Пароль задається в DASHBOARD_PASSWORD на Vercel, щонайменше 12 символів.'}>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Пароль"
              aria-label="Пароль"
              className="h-11 w-full bg-transparent px-4 text-[15px] outline-none placeholder:text-secondary"
            />
          </Group>
          <Group footer="Після цього часу без дій вхід гасне.">
            <select
              name="idle"
              defaultValue={DEFAULT_IDLE_MINUTES}
              aria-label="Вийти після бездіяльності"
              className="h-11 w-full bg-transparent px-4 text-[15px] outline-none"
            >
              {IDLE_OPTIONS_MINUTES.map((minutes) => (
                <option key={minutes} value={minutes}>
                  Вийти після {minutes} хв
                </option>
              ))}
            </select>
          </Group>
          <Button type="submit" variant="filled" disabled={pending} className="h-11">
            Увійти
          </Button>
        </FlexBox>
      </form>
    </PageFrame>
  );
}
