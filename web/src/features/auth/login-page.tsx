'use client';
import { useActionState } from 'react';
import { Button } from '@/components/button';
import { FlexBox } from '@/components/flex';
import { Group } from '@/components/group';
import { PageFrame } from '@/components/page-frame';
import { login, type LoginState } from '@/server/auth-actions';

export function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });

  return (
    <PageFrame title="Awake">
      <form action={action}>
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
          <Button type="submit" variant="filled" disabled={pending} className="h-11">
            Увійти
          </Button>
        </FlexBox>
      </form>
    </PageFrame>
  );
}
