'use client';
import { useMemo, useState } from 'react';
import { AppStateProvider } from '@/sdui/app-state-store';
import { ServerRuntimeProvider } from '@/sdui/runtime';
import { Banner, Shell } from '@/shell/app-shell';
import { SoloPage, StatusPage } from '@/shell/solo-page';
import { Button } from '@/ui/primitives';
import { useDevicePairing, type PairingStatus } from './pairing/use-device-pairing';
import { localSource, type UiSource } from './sources';
import { useLiveState } from './use-live-state';
import { useUiLayout } from './use-ui-layout';
import { SessionGate } from './web-auth/session-gate';
import { isTailnetHost } from './web-auth/web-auth-api';

const PAIRING_TEXT: Record<Exclude<PairingStatus, 'checking' | 'paired'>, { label: string; footer: string }> = {
  unpaired: {
    label: 'Потрібне сполучення',
    footer: 'Цей пристрій ще не сполучений з Mac. Відскануй QR у MaControl на Mac → «Пристрої», поки ти в довіреній Wi-Fi.',
  },
  waiting: { label: 'Підтверди на Mac', footer: 'На Mac з’явилось питання «Це ви?». Натисни «Дозволити», і Web UI відкриється тут сам.' },
  denied: { label: 'Сполучення відхилено', footer: 'На Mac натиснули «Відхилити». Щоб спробувати знову, відскануй QR ще раз.' },
  failed: { label: 'Посилання застаріло', footer: 'Код діє дві хвилини і лише раз. Відскануй новий QR у MaControl на Mac → «Пристрої».' },
};

const TAILNET_SOURCE = localSource(null);

/** Як часто локальний Web UI звіряє індекс і сторінку на екрані з агентом (запит з ETag, незмінне — 304). */
const POLL_MS = 2000;

/**
 * Локальний Web UI (агент на Mac віддає цю статичну збірку). Tailscale (`*.ts.net`): кукі й пароль через агента.
 * LAN: сполучення з Mac, далі індекс роутів і сторінки з його API з токеном пристрою. Показуємо лише те, що дав сервер.
 */
export function LocalApp() {
  const [tailnet] = useState(isTailnetHost);
  if (tailnet) return <SessionGate>{(logout) => <LocalUi source={TAILNET_SOURCE} onLeave={logout} leaveLabel="Вийти" />}</SessionGate>;
  return <LanApp />;
}

function LanApp() {
  const { status, token, forget } = useDevicePairing();
  const source = useMemo(() => (token ? localSource(token) : null), [token]);
  if (status === 'checking') return <SoloPage />;
  if (!source) return <StatusPage {...PAIRING_TEXT[status === 'paired' ? 'unpaired' : status]} />;
  return <LocalUi source={source} onLeave={forget} leaveLabel="Забути пристрій" />;
}

function LocalUi({ source, onLeave, leaveLabel }: { source: UiSource; onLeave: () => void; leaveLabel: string }) {
  const { shell, pages, error, unauthorized, loaded, send } = useUiLayout(source, POLL_MS);
  // Стейт іде живим каналом окремо від сторінок: старт і стоп сесії міняють його, а не layout.
  const state = useLiveState(source);
  const leave = (
    <Button size="sm" variant="ghost" onClick={onLeave}>
      {leaveLabel}
    </Button>
  );

  let body;
  if (!loaded) body = <div className="s-loading">MaControl…</div>;
  // 401: агент працює, але цей пристрій більше не впізнає (відкликали на Mac або токен застарів).
  else if (unauthorized) body = <StatusPage label="Пристрій не впізнано" footer={`Mac більше не впізнає цей пристрій. Натисни «${leaveLabel}» і сполучи його знову через QR у MaControl на Mac → «Пристрої».`} action={leave} />;
  else if (!shell && error) body = <StatusPage label="Сервер недоступний" value={error} footer="Агент MaControl на Mac не відповідає. Сторінка спробує знову сама." action={leave} />;
  else if (!shell || shell.pages.length === 0) body = <StatusPage label="Mac офлайн або ще не надіслав інтерфейс" footer="Щойно агент на Mac надішле інтерфейс, він з’явиться тут." action={leave} />;
  else body = <Shell shell={shell} pages={pages} trailing={leave} banner={error ? <Banner title="Сервер недоступний" details={[error, 'Показано останній отриманий стан.']} /> : undefined} />;

  return (
    <AppStateProvider value={state}>
      <ServerRuntimeProvider mode="live" send={send}>
        {body}
      </ServerRuntimeProvider>
    </AppStateProvider>
  );
}
