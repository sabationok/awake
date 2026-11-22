import type { DevicePairingPoll } from '@awake/contracts';
import { callAgent } from './agent-api';

const POLL_MS = 1500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Код із QR → запит «Це ви?» на Mac, далі опитування, поки там не натиснуть «Дозволити» чи «Ні».
 * `pairPath` — `/api/devices/pair` напряму в агента або `/api/mac/pair` через проксі Vercel.
 * Помилка запиту (код протух, Mac недоступний) — виняток; null — опитування скасували.
 */
export async function requestPairing(
  code: string,
  pairPath: string,
  { onWaiting, isCancelled }: { onWaiting: () => void; isCancelled: () => boolean },
): Promise<DevicePairingPoll | null> {
  const { requestId } = await callAgent<{ requestId: string }>(pairPath, null, { method: 'POST', body: JSON.stringify({ code }) });
  if (isCancelled()) return null;
  onWaiting();
  while (!isCancelled()) {
    const poll = await callAgent<DevicePairingPoll>(`${pairPath}/${encodeURIComponent(requestId)}`, null);
    if (poll.status !== 'pending') return poll;
    await sleep(POLL_MS);
  }
  return null;
}

/** Код одноразовий: читаємо його з `#p=` і одразу прибираємо з адреси, щоб не лишився в історії. */
export function takePairingCode(): string | null {
  const code = new URLSearchParams(location.hash.slice(1)).get('p');
  if (code) history.replaceState(null, '', location.pathname);
  return code;
}
