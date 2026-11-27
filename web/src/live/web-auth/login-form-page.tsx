'use client';
import { WEB_SESSION_IDLE_OPTIONS, type WebSessionIdleMinutes } from '@awake/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { AgentError } from '@/live/pairing/agent-api';
import { pathForNext } from '@/live/redirects/next-step';
import { safeNextPath } from '@/live/redirects/safe-next';
import { SoloPage } from '@/shell/solo-page';
import { Button, Field, Panel, Section, Select, TextInput } from '@/ui/primitives';
import { webAuthApi } from './web-auth-api';

const DEFAULT_IDLE: WebSessionIdleMinutes = 5;

const ERROR_TEXT: Record<string, string> = {
  INVALID_PASSWORD: 'Неправильний пароль.',
  TOO_MANY_ATTEMPTS: 'Забагато спроб. Спробуй за 15 хвилин.',
  PASSWORD_NOT_SET: 'Пароль ще не задано. Задай його на Mac: MaControl → Підключення → «Ключі аппки» → «Пароль Web UI».',
};

const IDLE_OPTIONS = WEB_SESSION_IDLE_OPTIONS.map((minutes) => ({ value: String(minutes), label: `Вийти після ${minutes} хв` }));

/** `/app/login/`: вхід паролем на сполученому пристрої (tailnet). Пароль перевіряє агент на Mac; він же ставить `mc_session`. */
export function LoginFormPage() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'));
  const [password, setPassword] = useState('');
  const [idleMinutes, setIdleMinutes] = useState<WebSessionIdleMinutes>(DEFAULT_IDLE);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || !password) return;
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
    <SoloPage>
      <form onSubmit={submit}>
        <Section title="Вхід" footer="Пароль задається на Mac у «Ключах аппки», щонайменше 12 символів." error={error}>
          <Panel>
            <div style={{ display: 'grid', gap: 14, padding: 14 }}>
              <Field id="login-password" label="Пароль">
                <TextInput
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Field id="login-idle" label="Після бездіяльності" hint="Після цього часу без дій вхід гасне.">
                <Select
                  id="login-idle"
                  label="Вийти після бездіяльності"
                  value={String(idleMinutes)}
                  options={IDLE_OPTIONS}
                  onChange={(value) => setIdleMinutes(Number(value) as WebSessionIdleMinutes)}
                />
              </Field>
              <Button type="submit" variant="accent" busy={pending} disabled={!password}>
                Увійти
              </Button>
            </div>
          </Panel>
        </Section>
      </form>
    </SoloPage>
  );
}
