'use client';
import type { WebSessionInfo } from '@macontrol/contracts';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { AgentError } from '@/live/pairing/agent-api';
import { pathForNext } from '@/live/redirects/next-step';
import { SoloPage, StatusPage } from '@/shell/solo-page';
import { useSessionIdle } from './use-session-idle';
import { webAuthApi } from './web-auth-api';

type GateState = { status: 'checking' } | { status: 'ready'; session: WebSessionInfo } | { status: 'offline' };

/**
 * Gate tailnet-входу: до рендеру дітей питає агента про сесію. Немає сесії → крок із відповіді (`auth/login` чи
 * `pair/scan`) → сторінка з мапи. Агент недоступний → «Сервер недоступний», запасного входу немає.
 * Бездіяльність довше за вибраний при вході час — вихід.
 */
export function SessionGate({ children }: { children: (logout: () => void) => ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>({ status: 'checking' });

  const leave = useCallback(
    (error: unknown) => {
      const next = (error as AgentError | null)?.next;
      if (next) router.replace(pathForNext(next, location.pathname + location.search + location.hash));
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

  if (state.status === 'checking') return <SoloPage />;
  if (state.status === 'offline') {
    return <StatusPage label="Сервер недоступний" footer="Mac вимкнений, спить або не в tailnet. Вхід можливий, лише коли агент на Mac працює." />;
  }
  return <>{children(logout)}</>;
}
