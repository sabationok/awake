'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { WebSessionInfo } from '@awake/contracts';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import type { AgentError } from '@/features/pairing/agent-api';
import { pathForNext } from '@/features/redirects/next-step';
import { useSessionIdle } from './use-session-idle';
import { webAuthApi } from './web-auth-api';

type GateState = { status: 'checking' } | { status: 'ready'; session: WebSessionInfo } | { status: 'offline' };

/**
 * Shell gate: до рендеру дітей питає агента про сесію. Немає сесії → крок із відповіді (`auth/login` чи
 * `pair/scan`) → сторінка з мапи. Агент недоступний → «Сервер недоступний», запасного входу немає.
 */
export function SessionGate({ children }: { children: (logout: () => void) => ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>({ status: 'checking' });

  const leave = useCallback(
    (error: unknown) => {
      const next = (error as AgentError | null)?.next;
      if (next) router.replace(pathForNext(next, location.pathname + location.search));
      else setState({ status: 'offline' });
    },
    [router],
  );

  useEffect(() => {
    webAuthApi.session().then((session) => setState({ status: 'ready', session }), leave);
  }, [leave]);

  const logout = useCallback(() => {
    void webAuthApi.logout().finally(() => router.replace(pathForNext({ type: 'auth', action: 'login' }, location.pathname)));
  }, [router]);
  const touch = useCallback(() => void webAuthApi.touch().catch(leave), [leave]);

  useSessionIdle(state.status === 'ready' ? state.session.idleMinutes : null, { touch, expire: logout });

  if (state.status === 'checking') return <PageFrame title="MaControl">{null}</PageFrame>;
  if (state.status === 'offline') {
    return (
      <PageFrame title="MaControl">
        <Group footer="Mac вимкнений, спить або не в tailnet. Вхід можливий, лише коли агент на Mac працює.">
          <KeyValueRow label="Сервер недоступний" />
        </Group>
      </PageFrame>
    );
  }
  return <>{children(logout)}</>;
}
